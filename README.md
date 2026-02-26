# 🗳️ StellarPoll — Live Blockchain Voting

A live polling dApp built on the Stellar blockchain for the Yellow Belt level of the Stellar Dev Workshop. Users can connect their Stellar wallet, cast a vote on-chain, and watch results update in real time.

---

## ✨ Features

- Multi-wallet support via StellarWalletsKit (Freighter, xBull)
- Vote Yes or No — stored permanently on the Stellar blockchain
- Live results that update every 5 seconds
- Prevents double voting — enforced by smart contract
- 3 error types handled: already voted, invalid option, network rejection
- Transaction hash confirmation with Stellar Explorer link

---

## 🛠️ Tech Stack

- React + Vite
- Stellar SDK (@stellar/stellar-sdk)
- StellarWalletsKit (@creit.tech/stellar-wallets-kit)
- Soroban Smart Contract (Rust)

---

## 📋 Setup Instructions

1. Clone the repo:
```
git clone https://github.com/Janhavim04/stellar-live-poll.git
cd stellar-live-poll
```

2. Install dependencies:
```
npm install
```

3. Run locally:
```
npm run dev
```

4. Install Freighter wallet from https://freighter.app and switch to Testnet

5. Fund your testnet wallet at https://friendbot.stellar.org

6. Open http://localhost:5173 and connect your wallet to vote!

---

## 📦 Smart Contract

**Contract Address:**
CAS7VM6JRZDPYPVAZNBTZOO65FH3C6RHZBUSTNYNIHON4UX2FAGN7X2N

**View on Stellar Expert:**
https://stellar.expert/explorer/testnet/contract/CAS7VM6JRZDPYPVAZNBTZOO65FH3C6RHZBUSTNYNIHON4UX2FAGN7X2N

**Contract Functions:**
- `vote(voter, option)` — Cast a vote (0 = Yes, 1 = No)
- `get_results()` — Returns current Yes and No vote counts
- `has_voted(voter)` — Returns true if wallet already voted

---

## 🚨 Error Handling

| Error | Trigger | Message |
|---|---|---|
| Already Voted | Same wallet votes twice | "You have already voted!" |
| Invalid Option | Option is not 0 or 1 | "Invalid vote option." |
| Network Rejection | Insufficient balance | "Network rejected the transaction." |

---

## 🔗 Links

- Stellar Expert Contract: https://stellar.expert/explorer/testnet/contract/CAS7VM6JRZDPYPVAZNBTZOO65FH3C6RHZBUSTNYNIHON4UX2FAGN7X2N
- Stellar Testnet Faucet: https://friendbot.stellar.org