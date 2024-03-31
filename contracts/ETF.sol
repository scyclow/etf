
// // SPDX-License-Identifier: MIT

import "./Dependencies.sol";

pragma solidity ^0.8.23;

/*
$ETF is not an exchange-traded product, nor is it another any other form of 1940 act mutual fund.



TODO
  - expense ratio once per Q




  - KYC
    - costs 0.01
      - first name
      - last name
      - SSN
    - id: address
    - can buy up to 1 ETH


  - deposit AP0 into SALE (S___ A____ Liquidity Event) contract
    - any KYC holder can use AP0 for one market day


  - wait one week until AP auction
  OR
  - same day AP auction



  - Expense Ratio
    - 0.03

    1.000000 eth
    0.0003
    - note that this is well below the industry standard



  - allow voting
    - 5/6 -> revoke 6th AP
    - each AP must chose 2 market holidays every 365 days
      - cannot choose overlapping days
      - max of 10 market holidays


*/


contract ETF is ERC20 {
  uint256 public constant TOKENS_PER_ETH = 10000;
  uint256 public constant MONDAY_AM_TIMESTAMP = 1704724200; // Mon Jan 08 2024 09:30:00
  uint256 public constant MARKET_OPEN_DURATION = 6 hours + 30 minutes;

  AuthorizedParticipant public authorizedParticipant;

  constructor() ERC20('ETF', 'ETF') {
    authorizedParticipant = new AuthorizedParticipant(msg.sender);
  }
  mapping(uint256 => uint256) public created;
  mapping(uint256 => uint256) public redeemed;

  event Creation(uint256 _tokenId, uint256 _amount);
  event Redemption(uint256 _tokenId, uint256 _amount);

  function nav() public view returns (uint256) {
    return (address(this).balance) / (totalSupply() / 1 ether);
  }

  function marketIsOpen() public view returns (bool) {
    uint256 timeElapsed = block.timestamp - MONDAY_AM_TIMESTAMP;
    uint256 daysElapsed = timeElapsed / 1 days;
    uint256 marketTime = timeElapsed % 1 days;

    uint8 dayOfWeek = uint8(daysElapsed % 7);
    bool validMarketDay = dayOfWeek < 5; // monday - friday
    bool validMarketTime = marketTime < MARKET_OPEN_DURATION;

    return validMarketDay && validMarketTime;
  }


  function create(uint256 tokenId, address recipient) external payable {
    require(msg.sender == authorizedParticipant.ownerOf(tokenId), 'Only Authorized Participants can create tokens');
    uint256 amountToCreate = msg.value * TOKENS_PER_ETH;
    _mint(recipient, amountToCreate);

    created[tokenId] += amountToCreate;
    authorizedParticipant.metadataUpdate(tokenId);
    emit Creation(tokenId, amountToCreate);
  }

  function redeem(uint256 tokenId,  address recipient, uint256 redeemAmount) external {
    require(msg.sender == authorizedParticipant.ownerOf(tokenId), 'Only Authorized Participants can redeem tokens');
    _burn(msg.sender, redeemAmount);
    bool sent = payable(recipient).send(redeemAmount / TOKENS_PER_ETH);
    require(sent);

    redeemed[tokenId] += redeemAmount;
    authorizedParticipant.metadataUpdate(tokenId);
    emit Redemption(tokenId, redeemAmount);
  }

  function _beforeTokenTransfer(address, address, uint256) internal virtual override {
    require(marketIsOpen(), 'Can only transfer during market trading hours (9:30am-4:00pm EST, M-F)');
  }
}


contract AuthorizedParticipant is ERC721, Ownable {
  uint256 public constant totalSupply = 6;
  // address public minter;

  ETF public etf;
  TokenURI public tokenURIContract;


  event MetadataUpdate(uint256 _tokenId);
  event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

  constructor(address _owner) ERC721('AuthorizedParticipant', 'AP') {
    etf = ETF(msg.sender);
    // minter = _owner;
    transferOwnership(_owner);
    tokenURIContract = new TokenURI(msg.sender);

    for (uint i; i < totalSupply; i++) {
      _mint(_owner, i);
    }
  }


  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  // function mint(address recipient, uint256 tokenId) public {
  //   require(minter == msg.sender, 'Caller is not the minting address');
  //   require(tokenId < totalSupply, 'Token ID out of bounds');

  //   _mint(recipient, tokenId);
  // }

  // function setMinter(address newMinter) external onlyOwner {
  //   minter = newMinter;
  // }

  function metadataUpdate(uint256 tokenId) external {
    require(msg.sender == address(etf));
    emit MetadataUpdate(tokenId);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return TokenURI(tokenURIContract).tokenURI(tokenId);
  }

  function setURIContract(address _uriContract) external onlyOwner {
    tokenURIContract = TokenURI(_uriContract);
    emit BatchMetadataUpdate(0, totalSupply);
  }

}


contract TokenURI {
  using Strings for uint256;

  ETF public etf;

  string public externalUrl = "https://steviep.xyz/etf";
  string public description = "ETF seeks to simulate the experience of owning shares of an exchange-traded fund that seeks to reflect, before fees and expenses, the performance of the price of Ethereum. Authorized Participants have the sole right (but not the obligation) to create and redeem shares of ETF. ";


  constructor(address _etf) {
    etf = ETF(_etf);
  }

  function tokenURI(uint256 tokenId) public view returns (string memory) {
    bytes memory encodedSVG = abi.encodePacked(
      'data:image/svg+xml;base64,',
      Base64.encode(rawSVG(tokenId))
    );

    uint256 tokensCreated = (etf.created(tokenId) / 1 ether);
    uint256 tokensRedeemed = (etf.redeemed(tokenId) / 1 ether);

    string memory attrs = string.concat(
      '[',
      '{"trait_type": "Tokens Created", "value": "', tokensCreated.toString(), '"},',
      '{"trait_type": "Tokens Redeemed", "value": "', tokensRedeemed.toString(), '"}',
      ']'
    );

    // TODO thumbnail

    bytes memory json = abi.encodePacked(
      'data:application/json;utf8,',
      '{"name": " Authorized Participant ', tokenId.toString(), '",',
      '"description": "', description, '",',
      '"image": "', encodedSVG, '",',
      '"attributes": ', attrs,',',
      '"external_url": "', externalUrl, '"',
      '}'
    );
    return string(json);
  }

  function rawSVG(uint256 tokenId) public pure returns (bytes memory) {
    string[2][6] memory params = [
      ['383a3c', 'fff'],
      ['0078bd', 'fff'],
      ['0078bd', '383a3c'],
      ['fff', '383a3c'],
      ['383a3c', '0078bd'],
      ['fff', '0078bd']
    ];

    return abi.encodePacked(
      '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">'
        '<style>'
          'text{font-family:monospace;fill:#',params[tokenId][0],';font-size:180px}'
          'rect{fill:#',params[tokenId][1],';stroke:#',params[tokenId][0],';stroke-width:35px}'
        '</style>'
        '<rect x="0" y="0" width="500" height="500"></rect>'
        '<text class="fillLight" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">AP',tokenId.toString(),'</text>'
      '</svg>'
    );
  }

}

