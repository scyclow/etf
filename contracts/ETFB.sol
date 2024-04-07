// SPDX-License-Identifier: MIT

import "./Dependencies.sol";

pragma solidity ^0.8.23;


contract ETFB is ERC20, IOptimismMintableERC20 {
  uint256 public constant INCEPTION = 1712563200; // 4/8 8:00am GMT
  address immutable REMOTE_TOKEN;
  address immutable BRIDGE;

  uint256 public constant MARKET_OPEN_DURATION = 8 hours + 30 minutes;
  bool public isDST;

  TimeLordBase public timeLord;

  mapping(uint256 => bool) public isMarketHoliday;
  mapping(uint256 => uint256) public yearToMarketHolidaysDeclared;

  event DeclareDST(bool value);
  event DeclareMarketHoliday(uint256 year, uint256 day);

  event Mint(address indexed account, uint256 amount);
  event Burn(address indexed account, uint256 amount);

  constructor(address _bridge, address _remoteToken) ERC20('ETF (Base)', 'ETF.B') {
    BRIDGE = _bridge;
    REMOTE_TOKEN = _remoteToken;
    timeLord = new TimeLordBase(msg.sender);
  }


  //// Bridging logic

  modifier onlyBridge() {
    require(msg.sender == BRIDGE, 'OptimismMintableERC20: only bridge can mint and burn');
    _;
  }

  function bridge() public view returns (address) {
    return BRIDGE;
  }

  function remoteToken() public view returns (address) {
    return REMOTE_TOKEN;
  }


  function mint(address _to, uint256 _amount)
    external
    virtual
    override(IOptimismMintableERC20)
    onlyBridge
  {
    _mint(_to, _amount);
    emit Mint(_to, _amount);
  }

  function burn(address _from, uint256 _amount)
    external
    virtual
    override(IOptimismMintableERC20)
    onlyBridge
  {
    _burn(_from, _amount);
    emit Burn(_from, _amount);
  }


  function supportsInterface(bytes4 _interfaceId) external pure virtual returns (bool) {
    bytes4 iface1 = type(IERC165).interfaceId;
    bytes4 iface2 = type(ILegacyMintableERC20).interfaceId;
    bytes4 iface3 = type(IOptimismMintableERC20).interfaceId;
    return _interfaceId == iface1 || _interfaceId == iface2 || _interfaceId == iface3;
  }


  function l1Token() public view returns (address) {
    return REMOTE_TOKEN;
  }

  function l2Bridge() public view returns (address) {
    return BRIDGE;
  }




  //// Market Hours

  function yearsElapsed() public view returns (uint256) {
    return (block.timestamp - INCEPTION) / 365 days;
  }

  function daysElapsed() public view returns (uint256) {
    uint256 dstAdjustment = isDST ? 1 hours : 0;
    uint256 timeElapsed = (block.timestamp - INCEPTION) + dstAdjustment;
    return timeElapsed / 1 days;
  }

  function isMarketOpen() public view returns (bool) {
    uint256 dstAdjustment = isDST ? 1 hours : 0;
    uint256 timeElapsed = (block.timestamp - INCEPTION) + dstAdjustment;
    uint256 marketTime = timeElapsed % 1 days;
    uint256 _daysElapsed = timeElapsed / 1 days;
    uint8 dayOfWeek = uint8(_daysElapsed % 7);

    return (
      dayOfWeek < 5 && !isMarketHoliday[_daysElapsed] // Monday - Friday & not a market holiday
      && marketTime < MARKET_OPEN_DURATION // 8:00am - 4:30pm (GMT or BST, depending on DST)
    );
  }

  function _beforeTokenTransfer(address, address, uint256) internal virtual override {
    if (msg.sender != BRIDGE) {
      require(isMarketOpen(), 'Can only transfer during market trading hours');
    }
  }


  //// Time Lord actions

  function declareMarketHoliday(uint256 day) external {
    require(msg.sender == timeLord.ownerOf(0), 'Only the Time Lord can declare Market Holidays');
    require(yearToMarketHolidaysDeclared[yearsElapsed()] < 8, 'The Time Lord can only declare 8 Market Holidays per fiscal year');
    require(day >= daysElapsed() && day <= (daysElapsed() + 366), 'The Time Lord can only declare Market Holidays within the fiscal year');

    if (!isMarketHoliday[day]) {
      isMarketHoliday[day] = true;
      yearToMarketHolidaysDeclared[yearsElapsed()]++;
      timeLord.metadataUpdate(0);
      emit DeclareMarketHoliday(yearsElapsed(), day);
    }
  }

  function declareDST(bool dst) external {
    require(msg.sender == timeLord.ownerOf(0), 'Only the Time Lord can declare DST');
    isDST = dst;
    timeLord.metadataUpdate(0);

    emit DeclareDST(dst);
  }

}


contract TimeLordBase is ERC721, Ownable {
  ETFB public etfb;
  TokenURIBase public tokenURIContract;

  uint256 public totalSupply = 1;

  event MetadataUpdate(uint256 _tokenId);
  event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

  constructor(address _owner) ERC721('Time Lord (Base)', 'TIME.B') {
    etfb = ETFB(msg.sender);
    tokenURIContract = new TokenURIBase(msg.sender);
    transferOwnership(_owner);
    _mint(_owner, 0);
  }

  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function metadataUpdate(uint256 tokenId) external {
    require(msg.sender == address(etfb));
    emit MetadataUpdate(tokenId);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return TokenURIBase(tokenURIContract).tokenURI(tokenId);
  }

  function setURIContract(address _uriContract) external onlyOwner {
    tokenURIContract = TokenURIBase(_uriContract);
    emit BatchMetadataUpdate(0, totalSupply);
  }


  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
    return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
  }
}



contract TokenURIBase {
  using Strings for uint256;

  ETFB public etfb;
  TimeLordBase public tl;

  string public externalUrl = "https://etf.steviep.xyz";


  constructor(address _etf) {
    etfb = ETFB(_etf);
    tl = TimeLordBase(msg.sender);
  }

  function tokenURI(uint256 tokenId) public view returns (string memory) {
    bytes memory encodedSVG = abi.encodePacked(
      'data:image/svg+xml;base64,',
      Base64.encode(timeLordSVG())
    );

    string memory attrs = getAttrs(tokenId);

    bytes memory json = abi.encodePacked(
      'data:application/json;utf8,',
      '{"name": "Time Lord (Base)",',
      '"description": "ETF.B seeks to simulate the experience of owning shares of ETF, which seeks to simulate the experience of owning an exchange-traded fund that seeks to reflect, before fees and expenses, the performance of the price of Ethereum. The Base Time Lord has the sole ability to declare Market Holidays and DST on Base.",',
      '"image": "', encodedSVG, '",',
      '"attributes": ', attrs,',',
      '"external_url": "', externalUrl, '"',
      '}'
    );
    return string(json);
  }

  function setURL(string memory url) external {
    require(msg.sender == tl.owner(), 'Only the Time Lord contract owner can set url');
    externalUrl = url;
  }


  function getAttrs(uint256) public view returns (string memory) {
    return string.concat(
      '[',
        '{"trait_type": "Market Holidays Set For Year", "value": "', etfb.yearToMarketHolidaysDeclared(etfb.yearsElapsed()).toString(), '"},',
        '{"trait_type": "Is DST", "value": "', etfb.isDST() ? 'True' : 'False', '"}',
      ']'
    );
  }

  function timeLordSVG() public view returns (bytes memory) {
    string memory c1 = etfb.isDST() ? '0a0b0d' : '0052ff';
    string memory c2 = etfb.isDST() ? '0052ff' : '0a0b0d';

    return abi.encodePacked(
      '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">'
        '<circle cx="250" cy="250" r="250" fill="#', c1, '"></circle>'
        '<circle cx="250" cy="250" r="230" fill="#', c2, '"></circle>'
        '<text x="250" y="270" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="250" font-family="sans-serif">TL</text>'
      '</svg>'
    );
  }


}