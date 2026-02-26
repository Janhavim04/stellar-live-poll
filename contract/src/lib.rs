#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, Map, Symbol};

// ── Error types ──
// These are the errors our contract can return
// Each one has a number ID that Soroban uses internally
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
pub enum PollError {
    AlreadyVoted  = 1,   // wallet has already voted
    InvalidOption = 2,   // option must be 0 or 1
}

// ── Storage keys ──
// Labels for our two "drawers" in blockchain storage
#[contracttype]
pub enum DataKey {
    Votes,      // stores { 0: yesCount, 1: noCount }
    HasVoted,   // stores { walletAddress: true/false }
}

// ── The contract ──
#[contract]
pub struct LivePollContract;

#[contractimpl]
impl LivePollContract {

    // FUNCTION 1: vote
    // Called when a user clicks Yes or No
    // option: 0 = Yes, 1 = No
    pub fn vote(env: Env, voter: Address, option: u32) -> Result<(), PollError> {

        // Error type 2: reject anything that isn't 0 or 1
        if option > 1 {
            return Err(PollError::InvalidOption);
        }

        // Prove the voter owns this wallet (triggers Freighter popup)
        voter.require_auth();

        // Open the HasVoted drawer (or create empty one if first time)
        let mut has_voted: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&DataKey::HasVoted)
            .unwrap_or(Map::new(&env));

        // Error type 1: reject if this wallet already voted
        if has_voted.get(voter.clone()).unwrap_or(false) {
            return Err(PollError::AlreadyVoted);
        }

        // Open the Votes drawer (or create empty one if first time)
        let mut votes: Map<u32, u32> = env
            .storage()
            .persistent()
            .get(&DataKey::Votes)
            .unwrap_or(Map::new(&env));

        // Add 1 to whichever option was chosen
        let current = votes.get(option).unwrap_or(0);
        votes.set(option, current + 1);

        // Mark this wallet as having voted
        has_voted.set(voter, true);

        // Save both drawers back to blockchain storage
        env.storage().persistent().set(&DataKey::Votes, &votes);
        env.storage().persistent().set(&DataKey::HasVoted, &has_voted);

        // Emit an event — frontend listens for this to update results live
        env.events().publish(
            (Symbol::new(&env, "vote_cast"),),
            option
        );

        Ok(())  // success
    }

    // FUNCTION 2: get_results
    // Returns (yesVotes, noVotes) as a pair
    // Frontend calls this to show live results
    pub fn get_results(env: Env) -> (u32, u32) {
        let votes: Map<u32, u32> = env
            .storage()
            .persistent()
            .get(&DataKey::Votes)
            .unwrap_or(Map::new(&env));

        let yes_votes = votes.get(0).unwrap_or(0);
        let no_votes  = votes.get(1).unwrap_or(0);

        (yes_votes, no_votes)
    }

    // FUNCTION 3: has_voted
    // Returns true if this wallet has already voted
    // Frontend uses this to block the vote button after voting
    pub fn has_voted(env: Env, voter: Address) -> bool {
        let has_voted: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&DataKey::HasVoted)
            .unwrap_or(Map::new(&env));

        has_voted.get(voter).unwrap_or(false)
    }
}