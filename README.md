# 🗳️ StellarPoll — Live Blockchain Voting

A live polling dApp built on the Stellar blockchain for the Yellow Belt level of the Stellar Dev Workshop. Users can connect their Stellar wallet, cast a vote on-chain, and watch results update in real time.

---

## ✨ Features

- Multi-wallet support via StellarWalletsKit (Freighter, xBull, LOBSTR, Hana)
- Vote Yes or No — stored permanently on the Stellar blockchain
- Live results that update every 5 seconds
- Prevents double voting — enforced by smart contract
- 3 error types handled: already voted, invalid option, network rejection
- Transaction hash confirmation with Stellar Explorer link
- Soroban smart contract deployed on Stellar Testnet

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
```
CAS7VM6JRZDPYPVAZNBTZOO65FH3C6RHZBUSTNYNIHON4UX2FAGN7X2N
```

**View on Stellar Expert:**
https://stellar.expert/explorer/testnet/contract/CAS7VM6JRZDPYPVAZNBTZOO65FH3C6RHZBUSTNYNIHON4UX2FAGN7X2N

**Contract Functions:**
- `vote(voter, option)` — Cast a vote (0 = Yes, 1 = No)
- `get_results()` — Returns current Yes and No vote counts
- `has_voted(voter)` — Returns true if wallet already voted

---

## 🚨 Error Handling

| Error | Trigger | Message shown to user |
|---|---|---|
| Already Voted | Same wallet votes twice | "You have already voted!" |
| Invalid Option | Option value is not 0 or 1 | "Invalid vote option." |
| Network Rejection | Insufficient balance or bad tx | "Network rejected the transaction." |

---

## 💳 Supported Wallets

| Wallet | Status |
|---|---|
| Freighter | ✅ Supported |
| xBull | ✅ Supported |
| LOBSTR | ✅ Supported |
| Hana Wallet | ✅ Supported |

---

## 📸 Screenshots

### Wallet Selection — 4 wallets supported
<img width="1919" height="954" alt="Screenshot 2026-02-26 142912" src="https://github.com/user-attachments/assets/18bf6a92-e460-4ae9-98b8-1a530aabfaab" />


### Connected Wallet with Live Results
<img width="1564" height="967" alt="image" src="https://github.com/user-attachments/assets/6dc0e1c5-35b0-4dd8-be66-51315477ea02" />



---

## 🔗 Links

- 🌐 Stellar Expert Contract: https://stellar.expert/explorer/testnet/contract/CAS7VM6JRZDPYPVAZNBTZOO65FH3C6RHZBUSTNYNIHON4UX2FAGN7X2N
- 💧 Stellar Testnet Faucet: https://friendbot.stellar.org
- 📖 Stellar Docs: https://developers.stellar.org
