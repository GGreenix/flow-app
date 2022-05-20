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
  // fcl.config({
  //   "accessNode.api": "https://access-testnet.onflow.org", // Mainnet: "https://access-mainnet-beta.onflow.org"
  //   "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn" // Mainnet: "https://fcl-discovery.onflow.org/authn"
  // })
  
  
const MINT = `\

// Mint NFT
import NonFungibleToken from 0xf8d6e0586b0a20c7
import TopTCollection from 0xf8d6e0586b0a20c7
import FungibleToken from 0xee82856bf20e2aa6


transaction {

    let receiverRef: &TopTCollection.Collection{NonFungibleToken.CollectionPublic, TopTCollection.TopTCollectionPublic}
    let creatorWalletCap: Capability<&{FungibleToken.Receiver}> 
   
    let addr: Address

    prepare(acct: AuthAccount) {
      

      // if collection is not created yet we make it.
      if acct.borrow<&TopTCollection.Collection>(from: TopTCollection.CollectionStoragePath) == nil {

            // create a new empty collection
            let collection <- TopTCollection.createEmptyCollection()
            
            // save it to the account
            acct.save(<-collection, to: TopTCollection.CollectionStoragePath)

            // create a public capability for the collection
            acct.link<&TopTCollection.Collection{NonFungibleToken.CollectionPublic, TopTCollection.TopTCollectionPublic}>(TopTCollection.CollectionPublicPath, target: TopTCollection.CollectionStoragePath)
        }
      
    self.receiverRef = acct.getCapability<&TopTCollection.Collection{NonFungibleToken.CollectionPublic, TopTCollection.TopTCollectionPublic}>(TopTCollection.CollectionPublicPath).borrow()!
    self.addr = acct.address
    self.creatorWalletCap = acct.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
    }

    execute {
        

        self.receiverRef.deposit(token: <-
        TopTCollection.mintNFT(
            name:"tal",
            description: "cool NFT",
            caption: "String ",
            storagePath: "String",
            artistAddress: self.addr,
            royalty: TopTCollection.Royalty(
                wallet: self.creatorWalletCap,
                cut: 0.1
            ),
            

          )
        )

    }
}
 

`
const LAZY_MINT = `\
  

// Mint NFT
import NonFungibleToken from 0xf8d6e0586b0a20c7
import TopTCollection from 0xf8d6e0586b0a20c7
import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79

transaction(
    seller: Address,
    royaltyCut: UFix64,
    salePrice: UFix64
) {

    let receiverRef: &TopTCollection.Collection{NonFungibleToken.CollectionPublic, TopTCollection.TopTCollectionPublic}
    let creatorWalletCap: Capability<&{FungibleToken.Receiver}> 
    
    let addr: Address

    prepare(acct: AuthAccount) {
      

      // if collection is not created yet we make it.
      if acct.borrow<&TopTCollection.Collection>(from: TopTCollection.CollectionStoragePath) == nil {

            // create a new empty collection
            let collection <- TopTCollection.createEmptyCollection()
            
            // save it to the account
            acct.save(<-collection, to: TopTCollection.CollectionStoragePath)

            // create a public capability for the collection
            acct.link<&TopTCollection.Collection{NonFungibleToken.CollectionPublic, TopTCollection.TopTCollectionPublic}>(TopTCollection.CollectionPublicPath, target: TopTCollection.CollectionStoragePath)
        }
      
    self.receiverRef = acct.getCapability<&TopTCollection.Collection{NonFungibleToken.CollectionPublic, TopTCollection.TopTCollectionPublic}>(TopTCollection.CollectionPublicPath).borrow()!
    self.addr = acct.address
    self.creatorWalletCap = getAccount(seller).getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
    let mainFlowVault = acct.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FlowToken vault from acct storage")
    self.creatorWalletCap.borrow()!.deposit(from: <- mainFlowVault.withdraw(amount: salePrice))
    }

    execute {
        

        self.receiverRef.deposit(token: <-
        TopTCollection.mintNFT(
            name:"tal",
            description: "cool NFT",
            caption: "String ",
            storagePath: "String",
            artistAddress: seller,
            royalty: TopTCollection.Royalty(
                wallet: self.creatorWalletCap,
                cut: royaltyCut
            ),
            

          )
        )

    }
}
 
`
const PRINT_SALES = `\
  
import NFTStorefront from 0xf8d6e0586b0a20c7

// This script returns an array of all the nft uuids for sale through a Storefront
pub fun main(account: Address): [UInt64] {
    let storefrontRef = getAccount(account)
        .getCapability<&NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}>(
            NFTStorefront.StorefrontPublicPath
        )
        .borrow()
        ?? panic("Could not borrow public storefront from address")
    let listingArray = storefrontRef.getListingIDs()
let listing = storefrontRef.borrowListing(listingResourceID: listingArray[2]!)!
// log(storefrontRef.getListingIDs())
log(listing)
return storefrontRef.getListingIDs()
    
}
`

const SIMPLE_PRINT_SCRIPT = `\
  
import TopTCollection from 0x1ce0bf81f5ff5ade

pub fun main(
  // recipient: Address
  ) :[UInt64]{
    let nftOwner = getAccount(0x1ce0bf81f5ff5ade)

    let capability = nftOwner.getCapability<&{TopTCollection.TopTCollectionPublic}>(TopTCollection.CollectionPublicPath)

    let receiverRef = capability.borrow()
        ?? panic("Could not borrow the receiver reference")

    
    log(TopTCollection.getArt(address: 0x1ce0bf81f5ff5ade))
    return receiverRef.getIDs()
}
`

const BUY = `\
import FungibleToken from 0xee82856bf20e2aa6
import NonFungibleToken from 0xf8d6e0586b0a20c7
import FlowToken from 0x0ae53cb6e3f42a79
import TopTCollection from 0xf8d6e0586b0a20c7
import NFTStorefront from 0xf8d6e0586b0a20c7


transaction(
    listingResourceID: UInt64, storefrontAddress: Address
    ) {
    let paymentVault: @FungibleToken.Vault
    let exampleNFTCollection: &TopTCollection.Collection{NonFungibleToken.Receiver}
    let storefront: &NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}
    let listing: &NFTStorefront.Listing{NFTStorefront.ListingPublic}

    prepare(acct: AuthAccount) {
        self.storefront = getAccount(storefrontAddress)
            .getCapability<&NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}>(
                NFTStorefront.StorefrontPublicPath
            )!
            .borrow()
            ?? panic("Could not borrow Storefront from provided address")

        self.listing = self.storefront.borrowListing(listingResourceID: listingResourceID)
                    ?? panic("No Offer with that ID in Storefront")
        let price = self.listing.getDetails().salePrice

        let mainFlowVault = acct.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FlowToken vault from acct storage")
        self.paymentVault <- mainFlowVault.withdraw(amount: price)

        self.exampleNFTCollection = acct.borrow<&TopTCollection.Collection{NonFungibleToken.Receiver}>(
            from: TopTCollection.CollectionStoragePath
        ) ?? panic("Cannot borrow NFT collection receiver from account")
    }

    execute {
        let item <- self.listing.purchase(
            payment: <-self.paymentVault
        )

        self.exampleNFTCollection.deposit(token: <-item)

        /* //-
        error: Execution failed:
        computation limited exceeded: 100
        */
        // Be kind and recycle
        //self.storefront.cleanup(listingResourceID: listingResourceID)
    }

    //- Post to check item is in collection?
}
`
const LIST_FOR_SALE = `\
import FungibleToken from 0xee82856bf20e2aa6
import NonFungibleToken from 0xf8d6e0586b0a20c7
import FlowToken from 0x0ae53cb6e3f42a79
import TopTCollection from 0xf8d6e0586b0a20c7
import NFTStorefront from 0xf8d6e0586b0a20c7

transaction(
    saleItemID: UInt64, saleItemPrice: UFix64
    ) {
    let flowReceiver: Capability<&FlowToken.Vault{FungibleToken.Receiver}>
    let exampleNFTProvider: Capability<&TopTCollection.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
    let storefront: &NFTStorefront.Storefront

    prepare(acct: AuthAccount) {
        // We need a provider capability, but one is not provided by default so we create one if needed.
        let TopTNFTCollectionProviderForNFTStorefront = /private/TopTNFTCollectionProviderForNFTStorefront

        self.flowReceiver = acct.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReceiver)!
        assert(self.flowReceiver.borrow() != nil, message: "Missing or mis-typed FlowToken receiver")
           

        if !acct.getCapability<&TopTCollection.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(TopTNFTCollectionProviderForNFTStorefront)!.check() {
            acct.link<&TopTCollection.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(TopTNFTCollectionProviderForNFTStorefront, target: TopTCollection.CollectionStoragePath)
        }

        self.exampleNFTProvider = acct.getCapability<&TopTCollection.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(TopTNFTCollectionProviderForNFTStorefront)!
        assert(self.exampleNFTProvider.borrow() != nil, message: "Missing or mis-typed TopTCollection.Collection provider")

        self.storefront = acct.borrow<&NFTStorefront.Storefront>(from: NFTStorefront.StorefrontStoragePath)
            ?? panic("Missing or mis-typed NFTStorefront Storefront")
    }

    execute {
        let saleCut = NFTStorefront.SaleCut(
            receiver: self.flowReceiver,
            amount: saleItemPrice
        )
        self.storefront.createListing(
            nftProviderCapability: self.exampleNFTProvider,
            nftType: Type<@TopTCollection.NFT>(),
            nftID: saleItemID,
            salePaymentVaultType: Type<@FlowToken.Vault>(),
            saleCuts: [saleCut]
        )
    }
}
 
`
async function lazyMint() {
  const artID = 0.01
  const price = 0.000001
  const currentUser = await fcl.currentUser().snapshot()
  const addr = currentUser.addr
  const tx = await fcl.send([
    fcl.transaction(LAZY_MINT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
    fcl.args([
      fcl.arg(currentUser,t.Address),
      fcl.arg(artID, t.UFix64),
      fcl.arg(price,t.UFix64)
    ]),
  ])
    
  fcl
    .tx(tx)
    .subscribe(console.log)
  
  

}
async function buy() {
  const artID = 0
  const price = 0.000001
  const tx = await fcl.send([
    fcl.transaction(BUY),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
    fcl.args([
      fcl.arg(artID, t.UInt64),
      fcl.arg(price,t.UFix64)
    ]),
  ])
    
  fcl
    .tx(tx)
    .subscribe(console.log)
  
  

}


async function lsit_for_sale() {
  const artID = 0
  const price = 0.000001
  const tx = await fcl.send([
    fcl.transaction(LIST_FOR_SALE),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
    fcl.args([
      fcl.arg(artID, t.UInt64),
      fcl.arg(price,t.UFix64)
    ]),
    
  ])
    
  fcl
    .tx(tx)
    .subscribe(console.log)
  
  

}
async function mint() {
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
  await console.log(tx)
  

}
async function printSales(){
  const currentUser = await fcl.currentUser().snapshot()
  const addr = currentUser.addr
  
const result = await fcl.query({
  cadence: PRINT_SALES,
  args: (arg, t) => [arg(addr, t.Address)],
});

  
console.log(result);


}
async function printNFTS(){
  // const currentUser = await fcl.currentUser().snapshot()
  // const addr = currentUser.addr
  
const result = await fcl.query({
  cadence: SIMPLE_PRINT_SCRIPT,
  // args: (arg, t) => [arg(addr, t.Address)],
});

  
console.log(result);


}

async function unauth(){
  fcl.currentUser.unauthenticate()
  const currentUser = await fcl.currentUser().snapshot()
  console.log("The Current User", currentUser)
}

async function auth(){
  fcl.authenticate().finally(async() => {

    const currentUser = await fcl.currentUser().snapshot()
  console.log("The Current User1", currentUser)
  })
  // const currentUser = await fcl.currentUser().snapshot()
  // console.log("The Current User1", currentUser)

  // const currentUser2 = await fcl.currentUser().snapshot()
  // console.log("The Current User2", currentUser2)
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
        onClick={buy}
        >
        buy
        </button>
        
        <button
        onClick={lsit_for_sale}
        >
          list for sale
        </button>
        

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
        onClick={printSales}
        >
          print Sales

        </button>
        <button
        onClick={printNFTS}
        >
          print NFTS

        </button>
        
        </div>
        
      </main>

      
        
      
    </div>
  )
}