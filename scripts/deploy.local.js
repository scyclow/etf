const ONE_DAY = 60 * 60 * 24
const TEN_MINUTES = 60 * 10
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

async function main() {
  const signers = await ethers.getSigners()

  minter = signers[0]
  ap0 = signers[1]
  ap1 = signers[2]
  ap2 = signers[3]
  ap3 = signers[4]
  ap4 = signers[5]
  ap5 = signers[6]



  const ETFFactory = await ethers.getContractFactory('ETF', minter)
  ETF = await ETFFactory.deploy()
  await ETF.deployed()

  const AuthorizedParticipantFactory = await ethers.getContractFactory('AuthorizedParticipant', minter)

  AuthorizedParticipant = await AuthorizedParticipantFactory.attach(
    await ETF.authorizedParticipant()
  )

  await AuthorizedParticipant.connect(minter).mint(ap0.address, 0)
  await AuthorizedParticipant.connect(minter).mint(ap1.address, 1)
  await AuthorizedParticipant.connect(minter).mint(ap2.address, 2)
  await AuthorizedParticipant.connect(minter).mint(ap3.address, 3)
  await AuthorizedParticipant.connect(minter).mint(ap4.address, 4)
  await AuthorizedParticipant.connect(minter).mint(ap4.address, 5)

  console.log(`ETF:`, ETF.address)
  console.log(`AuthorizedParticipant:`, AuthorizedParticipant.address)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });