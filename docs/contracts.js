const AUCTION_STRUCT = `(
  bool tokenExists,
  uint256 duration,
  uint256 bidIncreaseBps,
  uint256 bidTimeExtension,
  uint256 minBid,
  uint256 tokenId,
  uint256 startTime,
  address beneficiary,
  bool approveFutureTransfer,
  address minterContract,
  address rewardContract,
  address allowListContract
)`


const KYC_STRUCT = `(
    string firstName,
    string lastName,
    address addr
)`


CONTRACTS = {
  ETF: {
    addr: {
      local: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      sepolia: '0xcCeD8D66694FFCbAB3bBab982c302e08851022c4'
    },
    abi: [
      'function INCEPTION() external view returns (uint256)',
      'function isDST() external view returns (bool)',
      'function isMarketOpen() public view returns (bool)',
      'function daysElapsed() external view returns (uint256)',
      'function yearsElapsed() external view returns (uint256)',
      'function yearToMarketHolidaysDeclared(uint256) external view returns (uint256)',
      'function balanceOf(address owner) external view returns (uint256 balance)',
      'function created(uint256 tokenId) external view returns (uint256 amount)',
      'function redeemed(uint256 tokenId) external view returns (uint256 amount)',
      'function totalSupply() external view returns (uint256 supply)',
      'function transfer(address to, uint256 amount) external',
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function create(uint256 tokenId, address recipient) external payable',
      'function redeem(uint256 tokenId,  address recipient, uint256 redeemAmount) external',
      'function declareDST(bool dst) external',
      'function declareMarketHoliday(uint256) external',
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'event DeclareMarketHoliday(uint256 indexed year, uint256 day)',
      'event DeclareDST(bool value)',
    ],
  },
  AP: {
    addr: {
      local: '0xa16E02E87b7454126E5E10d957A927A7F5B5d2be',
      sepolia: '0xc953EA56eA69C63bEEfd1C07Db632AbB9e95f421',
    },
    abi: [
      'function ownerOf(uint256 tokenId) external view returns (address)',
    ]
  },
  KYC: {
    addr: {
      local: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      sepolia: '0x6be4ceD7E2c3b0c68dD2860E0250d6F1EbB8d069',
    },

    abi: [
      'function getId(string, string) external view returns (uint256)',
      `function kycInfo(uint256) external view returns (string firstName, string lastName, address addr)`,
      'function tokenURI(uint256) external view returns (string)',
      `function addrToTokenId(address) external view returns (uint256)`,
      'function balanceOf(address) external view returns (uint256)',
      'function register(string memory firstName, string memory lastName) external'
    ]
  },
  BROKER_DEALER: {
    addr: {
      local: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      sepolia: '0xd73dE3E4daBD65Fd91d7D09B69A730f726bd349C'
    },
    abi: [
      'function create(string, string) external payable',
      'function redeem(string, string, uint256) external',
      'function stakedTokenId() external view returns (uint256)'
    ]
  },
  AUCTION: {
    addr: {
      local: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      sepolia: '0x39098638ccBB39152F1B1a33D8c2E0c64ef9F469',
      mainnet: '0xd577B12732DA7557Db7eeA82e53d605f42C618d8'
    },
    abi: [
      'event BidMade(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 timestamp)',
      'function auctionCount() external view returns (uint256)',
      'function auctionIdToHighestBid(uint256) external view returns (uint256 amount, uint256 timestamp, address bidder)',
      'function auctionEndTime(uint256) external view returns (uint256 endTime)',
      `function auctionIdToAuction(uint256) external view returns (${AUCTION_STRUCT})`,
      'function isActive(uint256 auctionId) external view returns (bool)',
      'function isSettled(uint256 auctionId) external view returns (bool)',
      'function bid(uint256 auctionId, bool wantsReward) external payable',
      'function settle(uint256 auctionId) external payable',
    ]
  },
  // UNISWAP_V2: {
  //   addr: {},
  //   abi: [
  //     'function getReserves() external view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)'
  //   ]
  // }
}

  // async function getEthUsd(uniswapV2) {
  //   const decimals = 2
  //   const { _reserve0, _reserve1 } = await uniswapV2.getReserves()
  //   return _reserve0.mul(1000000000000).mul(10**decimals).div(_reserve1).toNumber() / 10**decimals
  // }