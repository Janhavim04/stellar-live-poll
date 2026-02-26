import { useState, useEffect, useCallback } from 'react'
import {
  Horizon,
  rpc,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Keypair,
  Account,
  nativeToScVal,
  scValToNative
} from '@stellar/stellar-sdk'
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  xBullModule
} from '@creit.tech/stellar-wallets-kit'
import './App.css'

//constants
const CONTRACT_ID        = 'CAS7VM6JRZDPYPVAZNBTZOO65FH3C6RHZBUSTNYNIHON4UX2FAGN7X2N'
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015'
const HORIZON_URL        = 'https://horizon-testnet.stellar.org'
const RPC_URL            = 'https://soroban-testnet.stellar.org'

const server    = new Horizon.Server(HORIZON_URL)
const rpcServer = new rpc.Server(RPC_URL)

//wallet kit
const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: [
    new FreighterModule(),
    new xBullModule(),
  ]
})

function App() {

  const [walletAddress, setWalletAddress] = useState(null)
  const [balance, setBalance]             = useState(null)
  const [hasVoted, setHasVoted]           = useState(false)
  const [yesVotes, setYesVotes]           = useState(0)
  const [noVotes, setNoVotes]             = useState(0)
  const [txStatus, setTxStatus]           = useState(null)
  const [txHash, setTxHash]               = useState('')
  const [errorMessage, setErrorMessage]   = useState('')
  const [isConnecting, setIsConnecting]   = useState(false)
  const [isVoting, setIsVoting]           = useState(false)


  //function1: connect wallet
  const connectWallet = async () => {
    setIsConnecting(true)
    setErrorMessage('')
    await new Promise(resolve => setTimeout(resolve, 300))
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            kit.setWallet(option.id)
            const { address } = await kit.getAddress()
            setWalletAddress(address)
            await fetchBalance(address)
            await checkHasVoted(address)
          } catch (err) {
            console.error('Wallet selected error:', err)
            setErrorMessage('Wallet connection failed. Please try again.')
          }
        }
      })
    } catch (err) {
      console.error('Modal error:', err)
      setErrorMessage('Could not open wallet selector.')
    }
    setIsConnecting(false)
  }


  //function2: disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress(null)
    setBalance(null)
    setHasVoted(false)
    setTxStatus(null)
    setTxHash('')
    setErrorMessage('')
  }


  //function3: fetch balance
  const fetchBalance = async (address) => {
    try {
      const account = await server.loadAccount(address)
      const xlm = account.balances.find(b => b.asset_type === 'native')
      setBalance(xlm ? parseFloat(xlm.balance).toFixed(4) : '0.0000')
    } catch (err) {
      setBalance('0.0000')
    }
  }


  //function4: fetch poll results from contract
  const fetchResults = useCallback(async () => {
    try {
      const contract      = new Contract(CONTRACT_ID)
      const sourceKeypair = Keypair.random()
      const sourceAccount = new Account(sourceKeypair.publicKey(), '0')

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('get_results'))
        .setTimeout(30)
        .build()

      const result = await rpcServer.simulateTransaction(transaction)

      if (rpc.Api.isSimulationSuccess(result)) {
        //scValToNative converts Soroban values to plain JS automatically
        const native = scValToNative(result.result.retval)
        if (Array.isArray(native) && native.length >= 2) {
          setYesVotes(Number(native[0]))
          setNoVotes(Number(native[1]))
        }
      }
    } catch (err) {
      console.error('Failed to fetch results:', err)
    }
  }, [])


  //function5: check if wallet has already voted
  const checkHasVoted = async (address) => {
    try {
      const contract      = new Contract(CONTRACT_ID)
      const sourceKeypair = Keypair.random()
      const sourceAccount = new Account(sourceKeypair.publicKey(), '0')

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'has_voted',
            nativeToScVal(address, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build()

      const result = await rpcServer.simulateTransaction(transaction)

      if (rpc.Api.isSimulationSuccess(result)) {
        //scValToNative converts the bool ScVal to a plain JS true/false
        const voted = scValToNative(result.result.retval)
        console.log('hasVoted value:', voted, typeof voted)
        setHasVoted(voted === true)
      }
    } catch (err) {
      console.error('Failed to check voted status:', err)
    }
  }


  //function6: cast vote
  const castVote = async (option) => {
    if (!walletAddress) return
    setIsVoting(true)
    setTxStatus('pending')
    setErrorMessage('')
    setTxHash('')

    try {
      const contract = new Contract(CONTRACT_ID)
      const account  = await server.loadAccount(walletAddress)

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'vote',
            nativeToScVal(walletAddress, { type: 'address' }),
            nativeToScVal(option, { type: 'u32' })
          )
        )
        .setTimeout(30)
        .build()

      // Step 1: Simulate to check for errors and get fees
      const simResult = await rpcServer.simulateTransaction(transaction)

      if (!rpc.Api.isSimulationSuccess(simResult)) {
        const errMsg = simResult.error || ''
        if (errMsg.includes('AlreadyVoted') || errMsg.includes('(1)')) {
          setErrorMessage('You have already voted!')
        } else if (errMsg.includes('InvalidOption') || errMsg.includes('(2)')) {
          setErrorMessage('Invalid vote option.')
        } else {
          setErrorMessage('Transaction simulation failed.')
        }
        setTxStatus('error')
        setIsVoting(false)
        return
      }

      // Step 2: Assemble with correct fees
      const preparedTx = rpc.assembleTransaction(
        transaction,
        simResult
      ).build()

      // Step 3: Sign with wallet
      const { signedTxXdr } = await kit.signTransaction(
        preparedTx.toXDR(),
        { networkPassphrase: NETWORK_PASSPHRASE }
      )

      // Step 4: Rebuild from signed XDR
      const signedTx = TransactionBuilder.fromXDR(
        signedTxXdr,
        NETWORK_PASSPHRASE
      )

      // Step 5: Submit to network
      const sendResult = await rpcServer.sendTransaction(signedTx)

      if (sendResult.status === 'ERROR') {
        setErrorMessage('Network rejected the transaction. Check your balance.')
        setTxStatus('error')
        setIsVoting(false)
        return
      }

      // Step 6: Wait for confirmation
      let txResult
      let attempts = 0
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, 1500))
        txResult = await rpcServer.getTransaction(sendResult.hash)
        if (txResult.status === 'SUCCESS') break
        if (txResult.status === 'FAILED')  break
        attempts++
      }

      if (txResult.status === 'SUCCESS') {
        setTxHash(sendResult.hash)
        setTxStatus('success')
        setHasVoted(true)
        await fetchResults()
      } else {
        setErrorMessage('Transaction failed on chain. Please try again.')
        setTxStatus('error')
      }

    } catch (err) {
      console.error('Vote error:', err)
      setErrorMessage('Something went wrong. Please try again.')
      setTxStatus('error')
    }
    setIsVoting(false)
  }


  //fetch results on load + every 5 seconds
  useEffect(() => {
    fetchResults()
    const interval = setInterval(fetchResults, 5000)
    return () => clearInterval(interval)
  }, [fetchResults])


  //helpers
  const totalVotes = yesVotes + noVotes
  const yesPercent = totalVotes === 0 ? 50 : Math.round((yesVotes / totalVotes) * 100)
  const noPercent  = totalVotes === 0 ? 50 : Math.round((noVotes  / totalVotes) * 100)


  return (
    <div className="app">

      <div className="bg-grid"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <div className="page-wrapper">

        <header className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <polygon points="16,2 30,9 30,23 16,30 2,23 2,9"
                  stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
                <circle cx="16" cy="16" r="3" fill="url(#lg)"/>
                <defs>
                  <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#63b3ed"/>
                    <stop offset="100%" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div className="logo-text">StellarPoll</div>
              <div className="logo-sub">Live Blockchain Voting</div>
            </div>
          </div>
          <div className="network-badge">
            <span className="network-dot"></span>
            Testnet
          </div>
        </header>

        <main className="main">

          {!walletAddress ? (

            <div className="landing">
              <div className="hero-glow"></div>

              <div className="poll-preview">
                <div className="poll-preview-tag">Live Poll</div>
                <h1 className="poll-question">
                  Is Stellar the best blockchain?
                </h1>
                <div className="poll-stats">
                  <div className="stat">
                    <div className="stat-number">{totalVotes}</div>
                    <div className="stat-label">Total Votes</div>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat">
                    <div className="stat-number">{yesPercent}%</div>
                    <div className="stat-label">Voting Yes</div>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat">
                    <div className="stat-number">{noPercent}%</div>
                    <div className="stat-label">Voting No</div>
                  </div>
                </div>
                <div className="preview-bar">
                  <div className="preview-bar-yes" style={{width: yesPercent + '%'}}></div>
                  <div className="preview-bar-no"  style={{width: noPercent  + '%'}}></div>
                </div>
              </div>

              <p className="connect-prompt">Connect your wallet to cast your vote</p>

              <button
                className={isConnecting ? 'connect-btn loading' : 'connect-btn'}
                onClick={connectWallet}
                disabled={isConnecting}
              >
                <span className="btn-inner">
                  {isConnecting ? (
                    <span className="spinner"></span>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {isConnecting ? 'Connecting...' : 'Connect Wallet to Vote'}
                </span>
              </button>

              <div className="wallet-options-hint">
                <span>Supports</span>
                <span className="wallet-chip">Freighter</span>
                <span className="wallet-chip">xBull</span>
                <span>and more</span>
              </div>
            </div>

          ) : (

            <div className="dashboard">

              <div className="wallet-bar">
                <div className="wallet-bar-left">
                  <span className="connected-dot"></span>
                  <span className="wallet-addr">
                    {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}
                  </span>
                  <span className="wallet-balance">{balance} XLM</span>
                </div>
                <button className="disconnect-btn" onClick={disconnectWallet}>
                  Disconnect
                </button>
              </div>

              <div className="poll-card">
                <div className="poll-card-tag">
                  <span className="live-dot"></span>
                  Live Poll
                </div>

                <h2 className="poll-card-question">
                  Is Stellar the best blockchain?
                </h2>

                <div className="vote-counts">
                  <div className="vote-count-item yes-color">
                    <span className="vote-count-num">{yesVotes}</span>
                    <span className="vote-count-label">Yes votes</span>
                  </div>
                  <div className="vote-count-total">{totalVotes} total</div>
                  <div className="vote-count-item no-color">
                    <span className="vote-count-num">{noVotes}</span>
                    <span className="vote-count-label">No votes</span>
                  </div>
                </div>

                <div className="results-bar">
                  <div className="results-bar-yes" style={{width: yesPercent + '%'}}>
                    {yesPercent > 10 && <span className="bar-label">{yesPercent}%</span>}
                  </div>
                  <div className="results-bar-no" style={{width: noPercent + '%'}}>
                    {noPercent > 10 && <span className="bar-label">{noPercent}%</span>}
                  </div>
                </div>

                <div className="bar-labels-row">
                  <span className="yes-color">Yes</span>
                  <span className="no-color">No</span>
                </div>

                {!hasVoted ? (
                  <div className="vote-actions">
                    <p className="vote-prompt">Cast your vote — stored forever on Stellar</p>
                    <div className="vote-buttons">
                      <button
                        className="vote-btn vote-yes"
                        onClick={function() { castVote(0) }}
                        disabled={isVoting}
                      >
                        <span className="btn-inner">
                          {isVoting ? <span className="spinner"></span> : <span>✓</span>}
                          {isVoting ? 'Submitting...' : 'Yes'}
                        </span>
                      </button>
                      <button
                        className="vote-btn vote-no"
                        onClick={function() { castVote(1) }}
                        disabled={isVoting}
                      >
                        <span className="btn-inner">
                          {isVoting ? <span className="spinner"></span> : <span>✕</span>}
                          {isVoting ? 'Submitting...' : 'No'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="already-voted">
                    <div className="already-voted-icon">✦</div>
                    <div className="already-voted-text">
                      Your vote is recorded on the blockchain
                    </div>
                  </div>
                )}

                {txStatus === 'pending' && (
                  <div className="tx-status tx-pending">
                    <span className="spinner"></span>
                    Broadcasting to Stellar network...
                  </div>
                )}

                {txStatus === 'success' && (
                  <div className="tx-status tx-success">
                    <div>✦ Vote confirmed on blockchain!</div>
                    <div className="tx-hash">
                      Hash: {txHash.slice(0,16)}...{txHash.slice(-8)}
                    </div>
                    <a
                      className="tx-link"
                      href={'https://stellar.expert/explorer/testnet/tx/' + txHash}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Stellar Expert
                    </a>
                  </div>
                )}

                {txStatus === 'error' && (
                  <div className="tx-status tx-error">
                    <div>✕ {errorMessage}</div>
                  </div>
                )}

              </div>

            </div>
          )}

        </main>

        <footer className="footer">
          StellarPoll · Built on Stellar Testnet · Votes stored on-chain forever
        </footer>

      </div>
    </div>
  )
}

export default App
