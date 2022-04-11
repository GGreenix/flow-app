import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const fcl = require("@onflow/fcl");
fcl.config()
  .put("accessNode.api", "https://flow-testnet.g.alchemy.com:443",)
  .put("grpc.metadata", {"api_key": "r9uf5vfdb09lnpdrltb6wprq6ta5e13s"}).put(
    'discovery.wallet',
    'https://flow-wallet-testnet.blocto.app/api/flow/authn'
  ).put('discovery.wallet.method', 'HTTP/POST'); 
  // access through alchemy^^^^^ DONT USE BEFORE ADDITIONAL RESEARCH ABOUT TRIAL
  
  

  // fcl.config()
  // .put("accessNode.api", "http://localhost:8080",)
  // .put("discovery.wallet", "http://localhost:8701/fcl/authn")

  const LIST_FOR_SALE = `\

  import Marketplace from 0x20a1514850974256
  import TopTNFTContract from 0x20a1514850974256
  import FungibleToken from 0x9a0766d93b6608b7
  
  //this transaction will setup an newly minted item for sale
  transaction(
      // artId: UInt64
      // price: UFix64
      ) {
  
      let artCollection:&TopTNFTContract.Collection
      let marketplace: &Marketplace.SaleCollection
  
      prepare(account: AuthAccount) {
  
  
          let marketplaceCap = account.getCapability<&{Marketplace.SalePublic}>(Marketplace.CollectionPublicPath)
          // if sale collection is not created yet we make it.
          if !marketplaceCap.check() {
               let wallet=  account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
               let sale <- Marketplace.createSaleCollection(ownerVault: wallet)
  
              account.unlink(Marketplace.CollectionPublicPath)
              destroy <- account.load<@AnyResource>(from:Marketplace.CollectionStoragePath)
  
              // store an empty NFT Collection in account storage
              account.save<@Marketplace.SaleCollection>(<- sale, to:Marketplace.CollectionStoragePath)
  
              // publish a capability to the Collection in storage
              account.link<&{Marketplace.SalePublic}>(Marketplace.CollectionPublicPath, target: Marketplace.CollectionStoragePath)
          }
  
          self.marketplace=account.borrow<&Marketplace.SaleCollection>(from: Marketplace.CollectionStoragePath)
            ?? panic("cant borrow marketplace")
          self.artCollection= account.borrow<&TopTNFTContract.Collection>(from: TopTNFTContract.CollectionStoragePath)
            ?? panic("cant borrow art collection")
      }
  
      execute {
          let art <- self.artCollection.withdraw(withdrawID: 8) as! @TopTNFTContract.NFT
          self.marketplace.listForSale(token: <- art, price: 5.0)
          self.marketplace.changePrice(tokenID: 8, newPrice: 10.0)
      }
  }
  
  `



const MINT = `\

// Mint NFT

import TopTNFTContract from 0x20a1514850974256
import FungibleToken from 0x9a0766d93b6608b7


transaction {

    let receiverRef: &{TopTNFTContract.CollectionPublic}
    let creatorWalletCap: Capability<&{FungibleToken.Receiver}> 
   
    let addr: Address

    prepare(acct: AuthAccount) {
        self.receiverRef = acct.getCapability<&{TopTNFTContract.CollectionPublic}>(TopTNFTContract.CollectionPublicPath).borrow()!
        self.addr = acct.address
        self.creatorWalletCap = acct.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
    }

    execute {
        

        self.receiverRef.deposit(token: <-
        TopTNFTContract.createArtWithContent(
            name:"tal",
            description: "cool NFT",
            artistAddress: self.addr,
            royalty: TopTNFTContract.Royalty(
                wallet: self.creatorWalletCap,
                cut: 0.1
            )
          )
        )

        log("NFT Minted and deposited to Account 2's Collection")
    }
}
 
    `

const BUY_NFT = `\
import Marketplace from 0x20a1514850974256
import TopTNFTContract from 0x20a1514850974256
import FungibleToken from 0x9a0766d93b6608b7

//Transaction to make a bid in a marketplace for the given dropId and auctionId
transaction(
    // marketplace: Address, tokenId: UInt64, amount: UFix64
    ) {
	// reference to the buyer's NFT collection where they
	// will store the bought NFT
	let vaultCap: Capability<&{FungibleToken.Receiver}>
	let collectionCap: Capability<&{TopTNFTContract.CollectionPublic}> 
	// Vault that will hold the tokens that will be used
	// to buy the NFT
	let temporaryVault: @FungibleToken.Vault

	prepare(account: AuthAccount) {

		// get the references to the buyer's Vault and NFT Collection receiver
		var collectionCap = account.getCapability<&{TopTNFTContract.CollectionPublic}>(TopTNFTContract.CollectionPublicPath)

		// if collection is not created yet we make it.
		if !collectionCap.check() {
			account.unlink(TopTNFTContract.CollectionPublicPath)
			destroy <- account.load<@AnyResource>(from:TopTNFTContract.CollectionStoragePath)

			// store an empty NFT Collection in account storage
			account.save<@TopTNFTContract.Collection>(<- TopTNFTContract.createEmptyCollection(), to: TopTNFTContract.CollectionStoragePath)

			// publish a capability to the Collection in storage
			account.link<&{TopTNFTContract.CollectionPublic}>(TopTNFTContract.CollectionPublicPath, target: TopTNFTContract.CollectionStoragePath)
		}

		self.collectionCap=collectionCap

		self.vaultCap = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)

		let vaultRef = account.borrow<&FungibleToken.Vault>(from: /storage/flowTokenVault)
		?? panic("Could not borrow owner's Vault reference")

		// withdraw tokens from the buyer's Vault
		self.temporaryVault <- vaultRef.withdraw(amount: 10.0)
	}

	execute {
		// get the read-only account storage of the seller
		let seller = getAccount(0x2f8ea8e52041ed8e)

		let marketplace= seller.getCapability(Marketplace.CollectionPublicPath).borrow<&{Marketplace.SalePublic}>()
		?? panic("Could not borrow seller's sale reference")

		marketplace.purchase(tokenID: 8, recipientCap:self.collectionCap, buyTokens: <- self.temporaryVault)
	}
}
    `

  const PREPARE_COLL_SALE = `\
  import Marketplace from 0x20a1514850974256
import TopTNFTContract from 0x20a1514850974256
import FungibleToken from 0x9a0766d93b6608b7

//this transaction will setup an newly minted item for sale
transaction(
    // artId: UInt64
    // price: UFix64
    ) {

    let artCollection:&TopTNFTContract.Collection
    let marketplace: &Marketplace.SaleCollection

    prepare(account: AuthAccount) {


        let marketplaceCap = account.getCapability<&{Marketplace.SalePublic}>(Marketplace.CollectionPublicPath)
        // if sale collection is not created yet we make it.
        if !marketplaceCap.check() {
             let wallet=  account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
             let sale <- Marketplace.createSaleCollection(ownerVault: wallet)

						account.unlink(Marketplace.CollectionPublicPath)
						destroy <- account.load<@AnyResource>(from:Marketplace.CollectionStoragePath)

            // store an empty NFT Collection in account storage
            account.save<@Marketplace.SaleCollection>(<- sale, to:Marketplace.CollectionStoragePath)

            // publish a capability to the Collection in storage
            account.link<&{Marketplace.SalePublic}>(Marketplace.CollectionPublicPath, target: Marketplace.CollectionStoragePath)
        }

        self.marketplace=account.borrow<&Marketplace.SaleCollection>(from: Marketplace.CollectionStoragePath)!
        self.artCollection= account.borrow<&TopTNFTContract.Collection>(from: TopTNFTContract.CollectionStoragePath)!
    }

    execute {
        let art <- self.artCollection.withdraw(withdrawID: 0) as! @TopTNFTContract.NFT
        self.marketplace.listForSale(token: <- art, price: 5.0)
        self.marketplace.changePrice(tokenID: 0, newPrice: 10.0)
    }
}
  
  
  `
const PREP_AUCTION = `\

// Transaction1.cdc
import FungibleToken from 0xf8d6e0586b0a20c7
import ExampleNFT from 0xf8d6e0586b0a20c7
import Auction from 0xf8d6e0586b0a20c7


transaction {

    // No need to do anything in prepare because we are not working with
    // account storage.
	prepare(acct: AuthAccount) {
    let receiver = acct.getCapability<&{FungibleToken.Receiver}>(/public/Receiver)
    let auctionHouse <- Auction.createAuctionCollection(marketplaceVault: receiver,cutPercentage:0.1)
    
			
		// Store the vault in the account storage
	
    // Create a new empty collection
    
    
    // store the empty NFT Collection in account storage
    
    acct.save(<- auctionHouse, to: /storage/AuctionHouse)
    

    acct.link<&{Auction.AuctionPublic}>(/public/AuctionPublic, target: /storage/AuctionHouse)
    
    
    log("Auction created and stored at Signer account")
    log("Collection created for account 1")
    }

    // In execute, we simply call the hello function
    // of the HelloWorld contract and log the returned String.
	execute {
	  	
	}
}
`
const PLACE_BID = `\

import ExampleNFT from 0x20a1514850974256
import Auction from 0x20a1514850974256

import FlowToken from 0x7e60df042a9c0868

import FungibleToken from 0x9a0766d93b6608b7

transaction() {

    let vaultCap: Capability<&{FungibleToken.Receiver}>
    let collectionCap: Capability<&{ExampleNFT.NFTReceiver}> 
    
    

    prepare(account: AuthAccount) {

        var collectionCap = account.getCapability<&{ExampleNFT.NFTReceiver}>(/public/NFTReceiver)

        if !collectionCap.check() {
					  account.unlink(ExampleNFT.CollectionPublicPath)
					  destroy <- account.load<@AnyResource>(from:ExampleNFT.CollectionStoragePath)
            

            account.link<&{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath, target: ExampleNFT.CollectionStoragePath)
        }
        let collectionRef = account.borrow<&ExampleNFT.Collection>(from: /storage/NFTCollection)
            ?? panic("Could not borrow a reference to the owner's collection")

        
        self.collectionCap=collectionCap
        
        self.vaultCap = account.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReciver)
                   
        let vaultRef = account.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow owner's Vault reference")

        let auctionHouseAdmin = getAccount(0x20a1514850974256)
        
        let auctionRef = auctionHouseAdmin.getCapability<&{Auction.AuctionPublic}>(/public/AuctionPublic).borrow()
            ?? panic("Could not borrow auction")
            
        auctionRef.placeBid(id: 3,bidTokens: <-vaultRef.withdraw(amount: 10.0),vaultCap: self.vaultCap,collectionCap: self.collectionCap)
    }
   

    execute {
        
    }
}
`


const PLACE_PROP = `\
import ExampleNFT from 0x20a1514850974256
import Auction from 0x20a1514850974256


import FungibleToken from 0xf8d6e0586b0a20c7

// Transaction to make a bid in a marketplace for the given dropId and auctionId
transaction() {
    // reference to the buyer's NFT collection where they
    // will store the bought NFT

    let vaultCap: Capability<&{FungibleToken.Receiver}>
    let collectionCap: Capability<&{ExampleNFT.NFTReceiver}> 
    
    

    prepare(account: AuthAccount) {

        // get the references to the buyer's Vault and NFT Collection receiver
        var collectionCap = account.getCapability<&{ExampleNFT.NFTReceiver}>(/public/NFTReceiver)

        // if collection is not created yet we make it.
        if !collectionCap.check() {
					  account.unlink(ExampleNFT.CollectionPublicPath)
					  destroy <- account.load<@AnyResource>(from:ExampleNFT.CollectionStoragePath)
            // store an empty NFT Collection in account storage
            

            // publish a capability to the Collection in storage
            account.link<&{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath, target: ExampleNFT.CollectionStoragePath)
        }
        let collectionRef = account.borrow<&ExampleNFT.Collection>(from: /storage/NFTCollection)
            ?? panic("Could not borrow a reference to the owner's collection")

        

        // Call the withdraw function on the sender's Collection
        // to move the NFT out of the collection
        
        // Call the withdraw function on the sender's Collection
        // to move the NFT out of the collection
        
        self.collectionCap=collectionCap
        
        self.vaultCap = account.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReciver)
                   
        let vaultRef = account.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow owner's Vault reference")

        let auctionHouseAdmin = getAccount(0x20a1514850974256)
        
        let auctionRef = auctionHouseAdmin.getCapability<&{Auction.AuctionPublic}>(/public/AuctionPublic).borrow()
            ?? panic("Could not borrow auction")
            
        
        auctionRef.createAuction(
            token: <- collectionRef.withdraw(withdrawID: 2), 
            minimumBidIncrement: 0.0, 
            auctionLength: 1000000.0, 
            auctionStartTime: getCurrentBlock().timestamp,
            startPrice: 10.0, 
            collectionCap: self.collectionCap, 
            vaultCap: self.vaultCap) 
    }
    

    
}
 
`

const PREPARE_NFT_COLLECTION = `\
import TopTNFTContract from 0x20a1514850974256


transaction {
    prepare(acct: AuthAccount) {

        // Create a new empty collection
        
        let newCollection <- TopTNFTContract.createEmptyCollection()
			
		// Store the vault in the account storage
	acct.save<@TopTNFTContract.Collection>(<- newCollection, to: TopTNFTContract.CollectionStoragePath)
    // Create a new empty collection
    
    let ReceiverRef = acct.link<&{TopTNFTContract.CollectionPublic}>(TopTNFTContract.CollectionPublicPath, target: TopTNFTContract.CollectionStoragePath)
        // store the empty NFT Collection in account storage
        

        
    }
}
 
`
const SIMPLE_PRINT_SCRIPT = `\
  
  import TopTNFTContract from 0x20a1514850974256

pub fun main(recipient: Address) :[UInt64]{
    let nftOwner = getAccount(recipient)

    let capability = nftOwner.getCapability<&{TopTNFTContract.CollectionPublic}>(TopTNFTContract.CollectionPublicPath)

    let receiverRef = capability.borrow()
        ?? panic("Could not borrow the receiver reference")

    log("Account 2 NFTs")
    log(receiverRef.getIDs())
    return receiverRef.getIDs()
}
`
const SETTLE_AUC = `\

import Auction from 0x20a1514850974256

transaction() {


    prepare(account: AuthAccount) {

    
        
      let auctionHouseAdmin = getAccount(0x20a1514850974256)
        let auctionRef = account.borrow<&Auction.AuctionCollection>(from: /storage/AuctionHouse)
            ?? panic("Could not borrow auction")
            
        
        auctionRef.changeLength(id:3,amount:0.0)
        auctionRef.settleAuction(3)
    }
}
`
const BUY = `\
import Marketplace from 0x20a1514850974256
import TopTNFTContract from 0x20a1514850974256
import FungibleToken from 0x9a0766d93b6608b7

//Transaction to make a bid in a marketplace for the given dropId and auctionId
transaction(
    // marketplace: Address, tokenId: UInt64, amount: UFix64
    ) {
	// reference to the buyer's NFT collection where they
	// will store the bought NFT
	let vaultCap: Capability<&{FungibleToken.Receiver}>
	let collectionCap: Capability<&{TopTNFTContract.CollectionPublic}> 
	// Vault that will hold the tokens that will be used
	// to buy the NFT
	let temporaryVault: @FungibleToken.Vault

	prepare(account: AuthAccount) {

		// get the references to the buyer's Vault and NFT Collection receiver
		var collectionCap = account.getCapability<&{TopTNFTContract.CollectionPublic}>(TopTNFTContract.CollectionPublicPath)

		// if collection is not created yet we make it.
		if !collectionCap.check() {
			account.unlink(TopTNFTContract.CollectionPublicPath)
			destroy <- account.load<@AnyResource>(from:TopTNFTContract.CollectionStoragePath)

			// store an empty NFT Collection in account storage
			account.save<@TopTNFTContract.Collection>(<- TopTNFTContract.createEmptyCollection(), to: TopTNFTContract.CollectionStoragePath)

			// publish a capability to the Collection in storage
			account.link<&{TopTNFTContract.CollectionPublic}>(TopTNFTContract.CollectionPublicPath, target: TopTNFTContract.CollectionStoragePath)
		}

		self.collectionCap=collectionCap

		self.vaultCap = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)

		let vaultRef = account.borrow<&FungibleToken.Vault>(from: /storage/flowTokenVault)
		?? panic("Could not borrow owner's Vault reference")

		// withdraw tokens from the buyer's Vault
		self.temporaryVault <- vaultRef.withdraw(amount: 10.0)
	}

	execute {
		// get the read-only account storage of the seller
		let seller = getAccount(0x20a1514850974256)

		let marketplace= seller.getCapability(Marketplace.CollectionPublicPath).borrow<&{Marketplace.SalePublic}>()
		?? panic("Could not borrow seller's sale reference")

		marketplace.purchase(tokenID: 0, recipientCap:self.collectionCap, buyTokens: <- self.temporaryVault)
	}
}

`

async function buy() {
  const tx = await fcl.send([
    fcl.transaction(BUY),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
    
  fcl
    .tx(tx)
    .subscribe(console.log)
  
  

}
async function settle(){

  const tx = await fcl.send([
    fcl.transaction(SETTLE_AUC),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  

  var transaction = await fcl.tx(tx).onceSealed().finally(() => {

  })
  console.log(transaction)
  
}
async function placeBid(){

  const tx = await fcl.send([
    fcl.transaction(PLACE_BID),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  

  var transaction = await fcl.tx(tx).onceSealed().finally(() => {

  })
  console.log(transaction)
  
}
async function mint(){

  const tx = await fcl.send([
    fcl.transaction(MINT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  fcl
    .tx(tx)
    .subscribe(console.log)
  
}
async function prepareCollSale(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(PREPARE_COLL_SALE),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

}
async function prepACcountVault(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(PRE_ACCT_VAULT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

}
async function unauth(){
  fcl.currentUser.unauthenticate()
  const currentUser = await fcl.currentUser().snapshot()
  console.log("The Current User", currentUser)
}

async function auth(){
  fcl.authenticate()
  const currentUser = await fcl.currentUser().snapshot()
  console.log("The Current User", currentUser)
}

async function buyNFT(){
  const tx = await fcl.send([
    fcl.transaction(BUY_NFT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  fcl
    .tx(tx)
    .subscribe(console.log)
}
async function prepAuction(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(PREP_AUCTION),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

}
async function prepareSale(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(LIST_FOR_SALE),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  fcl
    .tx(tx)
    .subscribe(console.log)
  
}

async function prepare(){
  
  const tx = await fcl.send([
    fcl.transaction(PREPARE_NFT_COLLECTION),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  
  fcl
  .tx(tx)
  .subscribe(console.log)
  
}
async function print(){
  const currentUser = await fcl.currentUser().snapshot()
  const addr = currentUser.addr
  
const result = await fcl.query({
  cadence: SIMPLE_PRINT_SCRIPT,
  args: (arg, t) => [arg(addr, t.Address)],
});

  
console.log(result);


}

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        

      

        <div className={styles.grid}>
        <button
        onClick={mint}
        >
          mint
        </button>
        <button
        onClick={unauth}
        >
        unauth
        </button>
        <button
        onClick={auth}
        >
          auth
        </button>
        
        <button
        onClick={buyNFT}
        >
        buy NFT!!!!!!!
        </button>
        <button
        onClick={prepare}
        >
          prepare account NFT collection
        </button>
        
        <button
        onClick={print}
        >
          printNFTS

        </button>
        <button
        onClick={prepareCollSale}
        >
          prepare sale collection
        </button> 
        <button
        onClick={prepareSale}
        >
          prepare NFT sale
        </button> 
        <button
        onClick={buy}
        >
          buy NFT
        </button> 
        </div>
        
      </main>

      
        
      
    </div>
  )
}
