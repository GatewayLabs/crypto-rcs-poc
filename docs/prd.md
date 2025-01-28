## 1. Introduction

### 1.1 Purpose
The purpose of this PRD is to outline the requirements for a decentralized Rock-Paper-Scissors game on an EVM-compatible chain that uses **Paillier homomorphic encryption** to ensure fair play. By employing homomorphic encryption, we allow each player to hide their choice (Rock, Paper, or Scissors) as ciphertext on-chain, preventing any other party from deciphering the move. Once both moves are on-chain, the house uses homomorphic operations to compute the encrypted difference of the moves, then decrypts only this difference to determine a fair outcome—without revealing each player’s move in plaintext on-chain.

### 1.2 Scope
- **High-level features** and **flow** of the Paillier-based RPS game.
- **Architectural decisions** such as Next.js 14 for the front-end and a Solidity smart contract on an EVM chain.
- **Paillier cryptosystem usage** for encrypting and partially computing results on-chain, ensuring only the house (private key holder) can decrypt.

---

## 2. Overview of the Game Flow

1. **Paillier Key Management**  
   - The house (or game operator) generates a Paillier key pair \((pk, sk)\) off-chain.  
   - The **public key** \((n, g)\) is deployed to or stored in the smart contract for all to see.  
   - The **private key** \((\lambda, \mu)\) is securely held by the house and **not** exposed publicly.

2. **Player A & Player B Submit Encrypted Moves**  
   - Each player selects Rock, Paper, or Scissors (mapped to \(\{0, 1, 2\}\)).  
   - Using the Paillier public key, each player encrypts their choice.  
   - The ciphertexts are transmitted to the smart contract in separate transactions.

3. **On-Chain Homomorphic Computation**  
   - After both encrypted choices are recorded on-chain, the contract uses homomorphic subtraction to compute an encrypted difference:  
     \[
       \text{Enc}(m_A) - \text{Enc}(m_B) = \text{Enc}(m_A - m_B).
     \]
   - This difference remains encrypted, so no one (besides the private key holder) knows the result yet.

4. **Decryption by the House**  
   - The house calls a function (e.g., `decryptAndResolveGame`) with a partial or full decryption parameter that reveals \((m_A - m_B)\) only.  
   - The contract uses that result—mod 3—to determine the winner. (e.g., 1 => Player A wins, 2 => Player B wins, 0 => tie)

5. **Result Display**  
   - The contract emits an event specifying the final winner.  
   - The front-end shows the game outcome without ever revealing each player's choice in plaintext on-chain.

---

## 3. Functional Requirements

1. **Paillier Encryption**  
   - Store the Paillier **public key** \((n, g)\) on-chain for encryption.  
   - Ensure each player’s front-end can encrypt an integer (0,1,2) plus a random nonce to produce ciphertext.

2. **Ciphertext Submission**  
   - Each player must submit their **encrypted** move to the contract.  
   - The contract must store both ciphertexts for subsequent operations.

3. **Homomorphic Operations**  
   - The contract uses **Paillier** library functions (e.g., `add`, `sub`, `mul_const`) to compute the game logic.  
   - Specifically, subtract \(\text{Enc}(m_B)\) from \(\text{Enc}(m_A)\) to obtain \(\text{Enc}(m_A - m_B)\).

4. **House-Controlled Decryption**  
   - The house holds the private key, which should **not** be stored on-chain.  
   - A function (e.g., `decryptAndResolveGame`) accepts the house’s partial decryption result and finalizes the game.

5. **Casino-Like UI**  
   - The front-end must present a clean, casino-style interface where players choose Rock, Paper, or Scissors.  
   - After encryption and submission, the front-end should provide status updates and display the final outcome once the house decrypts.

6. **On-Chain Verification**  
   - The final step (winner determination) must happen on-chain to ensure trust.  
   - Decryption and final comparison \((m_A - m_B) \bmod 3\) are validated by the contract before awarding a winner.

---

## 4. Non-Functional Requirements

1. **Performance**  
   - Paillier-based operations can be gas-intensive.  
   - The solution should optimize for minimal exponentiations and large integer operations on-chain.

2. **Security**  
   - The private key must remain off-chain.  
   - The Paillier cryptosystem must be properly implemented to avoid side-channel leaks or incorrect usage (e.g., random nonce generation off-chain).

3. **Reliability**  
   - The system should gracefully handle partial submissions (e.g., if a player fails to submit an encrypted move or the house doesn’t decrypt the result).  
   - Provide timeouts or refunds if necessary (optional for MVP).

4. **Maintainability**  
   - Code must be modular and well-documented:  
     - Paillier library for encryption/homomorphic ops.  
     - RPS logic for game state transitions.  
   - Potential for reusability in other homomorphic dApps.

---

## 5. User Stories & Use Cases

1. **Player Encrypts Move**  
   - *As a player (A or B), I want to choose Rock/Paper/Scissors and encrypt it with Paillier so that no one else knows my choice.*  

2. **Player Commits Ciphertext**  
   - *As a player, I want to send my encrypted choice (ciphertext) on-chain to compete in the RPS game.*  

3. **Homomorphic Difference**  
   - *As the contract, I need to compute the difference of the two encrypted moves on-chain so that only the final (mA - mB) is eventually decrypted.*  

4. **House Decrypts**  
   - *As the house (private key owner), I want to decrypt the final difference so I can prove the winner to all participants.*  

5. **View Result**  
   - *As a player or spectator, I want to see the final outcome (winner) as soon as it’s decrypted, without revealing each player’s choice.*  

---

## 6. Technical Design Choices

### 6.1 Front-End: Next.js 14
- **Reasons**:
  - Next.js 14 offers SSR/SSG, giving fast load times and potential for better SEO.  
  - Eases integration with Web3 libraries like `ethers.js`, and supports modern React patterns.

### 6.2 Smart Contract (Solidity)
- **Key Components**:
  - **Paillier Library**: Manages encryption, decryption, and homomorphic operations.  
  - **Game State**: Tracks each RPS game, storing:
    - Encrypted move from Player A.  
    - Encrypted move from Player B.  
    - Homomorphic difference ciphertext.  
    - Decrypted difference (final result).  
  - **Lifecycle Functions**:
    - `createGame(EncMoveA)`: Player A commits.  
    - `joinGame(gameId, EncMoveB)`: Player B commits.  
    - `computeDifference(gameId)`: Contract calculates `Enc(mA - mB)`.  
    - `decryptAndResolveGame(gameId, skPartial)`: House decrypts final difference and sets winner.

### 6.3 Paillier Cryptography
- **Public Key** \((n, g)\):
  - Stored in the contract.  
  - Allows on-chain multiplication/modular exponentiation for homomorphic operations.
- **Private Key** \((\lambda, \mu)\):
  - Held off-chain by the house.  
  - Only provided to the contract for the final decryption step (or partially via a ZKP or multi-step approach, if desired).
- **Encryption**:  
  \[
    \text{Enc}(m) = g^m \times r^n \mod n^2
  \]
- **Homomorphic Subtraction**:  
  \[
    \text{Enc}(x) - \text{Enc}(y) = \text{Enc}(x - y)
  \]
- **Decryption** (final difference):
  \[
    \text{Dec}(\text{Enc}(d)) = d \quad \text{where } d = (m_A - m_B) \mod n.
  \]

### 6.4 Wallet Integration
- **Libraries**:
  - `ethers.js` or `wagmi` for web3 interaction.  
  - Provide standard MetaMask, WalletConnect integration.

### 6.5 UI/UX
- **Design**: Casino-like style (dark backgrounds, neon highlights, playful animations).  
- **Steps**:
  1. Connect wallet.  
  2. Select Rock/Paper/Scissors.  
  3. Encrypt choice client-side (Paillier).  
  4. Submit ciphertext.  
  5. Wait for other player, contract computes difference.  
  6. House decrypts.  
  7. Result displayed with animations.

---

## 7. System Architecture

```
        +------------------------+
        |    Next.js 14 (UI)    |
        |  1. Connect Wallet    |
        |  2. Encrypt (Paillier)|
        |  3. Submit Ciphertext |
        +----------+------------+
                   |
                   | JSON-RPC
                   v
           +---------------------+
           | EVM Smart Contract |
           | - Stores ciphers   |
           | - sub(Enc(A),Enc(B))|
           | - difference ciph  |
           | - decryptAndResolve|
           +---------+----------+
                     |
                     | House/Private Key
                     v
           +---------------------+
           | Off-chain Key       |
           | - Decrypts diff     |
           +---------------------+
```

1. **Front-End** handles encryption of moves using the **public key**.  
2. **Smart Contract** receives ciphertexts, computes homomorphic difference, then stores the result.  
3. **House** calls a function with partial decryption info, enabling the contract to finalize the game result.

---

## 8. Testing & Validation

1. **Smart Contract Tests**  
   - **Paillier Integration**: Ensure encryption/decryption matches expected results.  
   - **Homomorphic Ops**: Validate that `Enc(x) - Enc(y) = Enc(x-y)` on test vectors.  
   - **RPS Logic**: Confirm correct final outcomes for different combos (Rock/Paper/Scissors).

2. **Front-End Tests**  
   - **Component Tests**: UI components for input, encryption, game status.  
   - **E2E Tests**: Simulate a full RPS game between two wallets.

3. **Gas & Performance Tests**  
   - Evaluate the cost of large exponentiations.  
   - Consider L2 solutions or alternative cost-saving techniques.

4. **Security Audit**  
   - Review correct usage of Paillier.  
   - Confirm no possibility for key leaks or manipulated decryption steps.

---

## 9. Risk & Mitigation

1. **Private Key Exposure**  
   - *Risk*: House’s private key on-chain makes it public.  
   - *Mitigation*: Keep it off-chain, pass only partial decryption or use oracles.

2. **High Gas Cost**  
   - *Risk*: Large exponentiations in Paillier might exceed typical gas budgets on mainnet.  
   - *Mitigation*: Deploy on a low-fee L2 or sidechain (e.g., Polygon, Arbitrum).

3. **House Collusion**  
   - *Risk*: House can see partial info once it has the ciphertext.  
   - *Mitigation*: If trust is an issue, consider multi-party computation or zero-knowledge.  

4. **Negative Result / Overflow**  
   - *Risk*: \((m_A - m_B)\) can be negative or exceed range.  
   - *Mitigation*: Use modular arithmetic (e.g., `% 3`) carefully with sign checks.