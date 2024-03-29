
// // SPDX-License-Identifier: MIT

import "./Dependencies.sol";
import "hardhat/console.sol";

pragma solidity ^0.8.23;

/*
$ETF is not an exchange-traded product, nor is it another any other form of 1940 act mutual fund.



TODO
  - expense ratio once per Q
  - update tests to 6 APs
*/


contract ETF is ERC20 {
  uint256 public constant TOKENS_PER_ETH = 10000;
  uint256 public constant MONDAY_AM_TIMESTAMP = 1704722400; // Mon Jan 08 2024 09:00:00
  uint256 public constant MARKET_OPEN_DURATION = 7 hours + 30 minutes;

  AuthorizedParticipant public authorizedParticipant;


  constructor() ERC20('ETF', 'ETF') {
    authorizedParticipant = new AuthorizedParticipant(msg.sender);
  }

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


  function create(address recipient) external payable {
    require(msg.sender == address(authorizedParticipant), 'Only Authorized Participants can create tokens');
    uint256 amountToCreate = msg.value * TOKENS_PER_ETH;
    _mint(recipient, amountToCreate);
  }

  function redeem(address recipient, address sender, uint256 amountToBurn) external {
    require(msg.sender == address(authorizedParticipant), 'Only Authorized Participants can redeem tokens');
    _burn(sender, amountToBurn);
    bool sent = payable(recipient).send(amountToBurn / TOKENS_PER_ETH);
    require(sent);
  }

  function _beforeTokenTransfer(address, address, uint256) internal virtual override {
    require(marketIsOpen(), 'Can only transfer during market trading hours (9am-4:30pm EST, M-F)');
  }
}


contract AuthorizedParticipant is ERC721, Ownable {
  uint256 public constant totalSupply = 6;
  address public minter;

  ETF public etf;
  TokenURI public tokenURIContract;

  mapping(uint256 => uint256) public created;
  mapping(uint256 => uint256) public redeemed;

  event Creation(uint256 _tokenId, uint256 _amount);
  event Redemption(uint256 _tokenId, uint256 _amount);

  event MetadataUpdate(uint256 _tokenId);
  event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

  constructor(address _owner) ERC721('AuthorizedParticipant', 'AP') {
    etf = ETF(msg.sender);
    minter = _owner;
    transferOwnership(_owner);
    tokenURIContract = new TokenURI();
  }


  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function mint(address recipient, uint256 tokenId) public {
    require(minter == msg.sender, 'Caller is not the minting address');
    require(tokenId < totalSupply, 'Token ID out of bounds');

    _mint(recipient, tokenId);
  }

  function setMinter(address newMinter) external onlyOwner {
    minter = newMinter;
  }


  function create(uint256 tokenId, address recipient) external payable {
    require(msg.sender == ownerOf(tokenId), 'Only Authorized Participants can create tokens');
    etf.create{value: msg.value}(recipient);
    uint256 amount = msg.value * etf.TOKENS_PER_ETH();
    created[tokenId] += amount;

    emit Creation(tokenId, amount);
    emit MetadataUpdate(tokenId);
  }

  function redeem(uint256 tokenId,  address recipient, uint256 redeemAmount) external {
    require(msg.sender == ownerOf(tokenId), 'Only Authorized Participants can redeem tokens');
    etf.redeem(recipient, msg.sender, redeemAmount);
    redeemed[tokenId] += redeemAmount;

    emit Redemption(tokenId, redeemAmount);
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

  AuthorizedParticipant public baseContract;

  string public externalUrl = '';
  string public description = "";



  constructor() {
    baseContract = AuthorizedParticipant(msg.sender);
  }

  function tokenURI(uint256 tokenId) public view returns (string memory) {
    bytes memory encodedSVG = abi.encodePacked(
      'data:image/svg+xml;base64,',
      Base64.encode(rawSVG(tokenId))
    );

    uint256 tokensCreated = (baseContract.created(tokenId) / 1 ether);
    uint256 tokensRedeemed = (baseContract.redeemed(tokenId) / 1 ether);

    string memory attrs = string.concat(
      '[',
      '{"trait_type": "Tokens Created", "value": "', tokensCreated.toString(), '"},',
      '{"trait_type": "Tokens Redeemed", "value": "', tokensRedeemed.toString(), '"}',
      ']'
    );

    // TODO thumbnail

    bytes memory json = abi.encodePacked(
      'data:application/json;utf8,',
      '{"name": " Authorized Participant #', tokenId.toString(), '",',
      '"description": "', description, '",',
      '"image": "', encodedSVG, '",',
      '"attributes": ', attrs,',',
      '"external_url": "', externalUrl, '"',
      '}'
    );
    return string(json);
  }

  function rawSVG(uint256 tokenId) public pure returns (bytes memory) {
    string[3][6] memory params = [
      ['0', '383a3c', 'fff'],
      ['1', '0078bd', 'fff'],
      ['2', '0078bd', '383a3c'],
      ['3', 'fff', '383a3c'],
      ['4', '383a3c', '0078bd'],
      ['5', 'fff', '0078bd']
    ];

    return abi.encodePacked(
      '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">'
        '<style>'
          'text{font-family:monospace;fill:#',params[tokenId][1],';font-size:180px}'
          'rect{fill:#',params[tokenId][2],';stroke:#',params[tokenId][1],';stroke-width:35px}'
        '</style>'
        '<rect x="0" y="0" width="500" height="500"></rect>'
        '<text class="fillLight" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">AP',params[tokenId][0],'</text>'
      '</svg>'
    );
  }

}

