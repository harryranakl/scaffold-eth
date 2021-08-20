import { Row, Col, Layout, Space, Divider, Radio, Input, Button, Table, Card, Tag } from "antd";
import "antd/dist/antd.css";
import "./App.css";
import React, { useState } from "react";
// import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
import axios from "axios";
import { addABI, decodeLogs } from "abi-decoder";

import { HeaderSt } from "./components";
import { useOnBlock, usePoller } from "./hooks";

import { INFURA_ID, NETWORK, NETWORKS } from "./constants";

const { ethers } = require("ethers");
const { Header, Footer, Content } = Layout;

const eventsJson = [
  //erc20
  { text_signature: "event Transfer(address indexed from, address indexed to, uint256 value)" },
  // { text_signature: "event Approval(address indexed owner, address indexed spender, uint256 value)" },
  //WETH
  { text_signature: "event Deposit(address indexed dst, uint wad)" },
  { text_signature: "event Withdrawal(address indexed src, uint wad)" },
  //IUniswapExchange
  {
    text_signature:
      "event TokenPurchase(address indexed buyer, uint256 indexed eth_sold, uint256 indexed tokens_bought)",
  },
  {
    text_signature: "event EthPurchase(address indexed buyer, uint256 indexed tokens_sold, uint256 indexed eth_bought)",
  },
  {
    text_signature:
      "event AddLiquidity(address indexed provider, uint256 indexed eth_amount, uint256 indexed token_amount)",
  },
  {
    text_signature:
      "event RemoveLiquidity(address indexed provider, uint256 indexed eth_amount, uint256 indexed token_amount)",
  },
  //IUniswapV2Pair
  { text_signature: "event Mint(address indexed sender, uint amount0, uint amount1)" },
  { text_signature: "event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)" },
  {
    text_signature:
      "event Swap(address indexed sender, uint amount0, uint amount1, uint amount0Out, uint amount1Out, address indexed to)",
  },
  // { text_signature: "event Sync(uint112 reserve0, uint112 reserve1)" },
];

const addEvents = async () => {
  eventsJson.map(async e => {
    let { text_signature } = e;
    try {
      let i = new ethers.utils.Interface([text_signature]);
      await addABI(i.fragments);
    } catch (e) {
      // console.log(e);
    }
  });
};
addEvents();

const DEXES = ["coingecko"];
const tokensList = [];
const loadTokens = () => {
  DEXES.map(d => {
    let { tokens } = require(`../json/${d}-json.json`);
    tokensList.push(tokens);
  });
};
loadTokens();

const getToken = _address => {
  let c = {
    coin: "",
    logo: "",
    decimals: 18,
  };
  _address = _address.toLowerCase();

  for (let d in tokensList) {
    for (let t in tokensList[d]) {
      let o = tokensList[d][t];
      try {
        if (o.address.toLowerCase() === _address) {
          c.coin = o.symbol;
          c.logo = o.logoURI ? o.logoURI : "";
          c.decimals = o.decimals ? o.decimals : 0;
          break;
        }
      } catch (e) {
        // console.log(e)
      }
    }

    if (c.coin !== "") {
      break;
    }
  }
  // console.log('coin --', c);
  return c;
};

const txLink = _tx => `https://etherscan.io/tx/${_tx}`;
const addressLink = _a => `https://etherscan.io/address/${_a}`;
const shortTxt = _t => `${_t.substr(0, 20)}..`;

const fromWei = i => {
  return i / 10 ** 18;
};
const fromGWei = i => {
  return i / 10 ** 9;
};
const toGWei = i => {
  return i * 10 ** 9;
};

// sort array ascending
const asc = arr => arr.sort((a, b) => a - b);

const sum = arr => arr.reduce((a, b) => a + b, 0);

const mean = arr => sum(arr) / arr.length;

// sample standard deviation
const std = arr => {
  const mu = mean(arr);
  const diffArr = arr.map(a => (a - mu) ** 2);
  return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

const quantile = (arr, q) => {
  const sorted = asc(arr);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};

const gasConverter = g => {
  const gm = g * 100000000;
  const gd = parseInt(gm, 10) / 10 ** 9;
  return gd;
};

// 😬 Sorry for all the console logging
// const DEBUG = true;

const mainnetInfura = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
  : null;

function App(props) {
  const mainnetProvider = mainnetInfura;

  const [blockNum, setBlockNum] = useState(0);
  const [Loading, setLoading] = useState(0);
  const [BlockTrxsData, setBlockTrxsData] = useState([]);
  const [BlockLogsData, setBlockLogsData] = useState([]);

  const fbAPI = "https://blocks.flashbots.net/v1/blocks";

  const getBlocks = async params => {
    params.limit = "20";
    const fburl = `${fbAPI}/?${new URLSearchParams(params)}`;

    const config = {
      timeout: 30000,
      url: fburl,
      method: "get",
      responseType: "json",
    };
    const res = await axios(config);
    const { blocks } = res.data;

    if(blocks.length){
      const tblocks = blocks.map(block => transformBundle(block));

      const fb = blocks[blocks.length - 1].block_number;
      const tb = blocks[0].block_number;
      const logs = await getLogs(fb, tb);
      const flogs = filterLogs(tblocks, logs);

      const lblocks = tblocks.map(block => transformLogs(block, flogs));

      setBlockTrxsData(lblocks);
    }
    
  };

  const getSubBundles = bundle => {
    return bundle.transactions.reduce((acc, curr) => {
      if (acc[curr.bundle_index]) {
        acc[curr.bundle_index].push(curr);
      } else {
        acc[curr.bundle_index] = [curr];
      }
      return acc;
    }, []);
  };

  const getBundleHashes = bundle => {
    const h = [];
    bundle.transactions.forEach(tb => {
      tb.forEach(t => {
        h.push(t.transaction_hash);
      });
    });
    return h;
  };

  const transformBundle = bundle => {
    bundle.transactions = getSubBundles(bundle);
    bundle.hashes = getBundleHashes(bundle);
    return bundle;
  };

  const getLogs = async (fb, tb) => {
    const filter = {
      fromBlock: ethers.utils.hexValue(parseInt(fb)),
      toBlock: ethers.utils.hexValue(parseInt(tb)),
    };
    try {
      const res = await mainnetProvider.getLogs(filter);
      return res;
    } catch (e) {
      console.log(e);
    }

    return [];
  };

  const filterLogs = (blocks, logs) => {
    const flogs = [];
    const hashArr = [];
    blocks.forEach(b => {
      b.hashes.forEach(h => hashArr.push(h));
    });
    logs.forEach(l => {
      if (hashArr.includes(l.transactionHash)) {
        flogs.push(l);
      }
    });
    return flogs;
  };

  const transformLogs = (bundle, logs) => {
    bundle.transactions.forEach(b => {
      b.forEach(async t => {
        const larr = [];
        logs.forEach(l => {
          if (t.transaction_hash == l.transactionHash) {
            larr.push(l);
          }
        });
        t.logs = await getAllLogs(larr);
      });
    });
    return bundle;
  };

  const getAllLogs = async logs => {
    try{
      const dlogs = await Promise.all(decodeLogs(logs));
      dlogs.map(async log => {
        const { coin, logo, decimals } = await getToken(log.address);
        let value;
        log.events.map(e => {
          if (e.type.match("uint") && e.value > 0) {
            value = parseFloat(e.value / 10 ** decimals).toFixed(6);
          }
          // if(log.name == "Swap") console.log(e);
        });
        log.coin = {
          address: log.address,
          name: coin,
          event: log.name.toLowerCase(),
          logo,
          decimals,
          value,
        };
        return log;
      });
      return dlogs;
    } catch (e) {
      console.log(e);
    }
  };

  const onChangeBlockNum = async e => {
    const bn = e.target.value;
    // console.log('value --', bn);

    if(parseInt(bn).toString().length >= 8 || bn == ""){
      await setLoading(0);
      await bn ? getBlocks({block_number:bn}): getBlocks({});
      await setLoading(1);
    }
  };

  const refresh = async e => {
    await setLoading(0);
    await getBlocks({});
    await setLoading(1);
  };

  const init = async (bn) => {
    
    if (BlockTrxsData.length == 0 ) {
      await setLoading(0);
      await getBlocks({});
      await setLoading(1);
    }
    // console.log('BlockTrxsData --',BlockTrxsData);
  };

  useOnBlock(mainnetProvider, async () => {
    // console.log(mainnetProvider)
    const bn = await mainnetProvider._lastBlockNumber;
    setBlockNum(bn);

    // console.log(`⛓ mainnet block : ${bn}`);
    // console.log('⛓ trxsEMF',trxsEMF);

    init();
  });
  // usePoller(init, 10000);

  const cols = [
    {
      title: "details",
      dataIndex: "block_number",
      key: "block_number",
      width: "100%",
      render: (text, record, index) => {
        // console.log(record);

        const block_number = record.block_number;
        const miner_reward = parseFloat(fromWei(record.miner_reward)).toFixed(6);
        const gas_used = record.gas_used;
        const gas_price = parseFloat(fromGWei(record.gas_price)).toFixed(6);
        const bundles = record.transactions;
        return (
          <>
            <Card
              size="small"
              title={
                <>
                  <Tag color="blue">block #{block_number}</Tag>
                  <Tag color="blue">bundles: {bundles.length}</Tag>
                </>
              }
              extra={<></>}
              style={{}}
            >
              <Card.Grid style={{ width: "35%", padding: "5px 12px", backgroundColor: "##a2baec" }} hoverable={false}>
                miner reward (eth): {miner_reward}
              </Card.Grid>
              <Card.Grid style={{ width: "30%", padding: "5px 12px", backgroundColor: "##a2baec" }} hoverable={false}>
                gas used: {gas_used}
              </Card.Grid>
              <Card.Grid style={{ width: "35%", padding: "5px 12px", backgroundColor: "##a2baec" }} hoverable={false}>
                gas price (gwei): {gas_price}
              </Card.Grid>
              {bundles.length > 0 &&
                bundles.map((b, i) => {
                  return (
                    <>
                      <Card.Grid style={{ width: "100%", padding: 5 }} hoverable={false}>
                        <Card
                          size="small"
                          title={
                            <>
                              <Tag color="blue">bundle #{i}</Tag>
                              <Tag color="blue">txs: {b.length}</Tag>
                            </>
                          }
                          extra={<> </>}
                          style={{}}
                          headStyle={{ backgroundColor: "##a2baec" }}
                        >
                          {b &&
                            b.length > 0 &&
                            b.map((t, ii) => {
                              // console.log(t)
                              const trxhash = t.transaction_hash;
                              const trxhashLink = txLink(trxhash);
                              const trxhashTxt = shortTxt(trxhash);

                              const fadd = t.eoa_address;
                              const faddLink = addressLink(fadd);
                              const faddTxt = shortTxt(fadd);

                              const tadd = t.to_address;
                              const taddLink = addressLink(tadd);
                              const taddTxt = shortTxt(tadd);

                              const miner_reward = parseFloat(fromWei(t.total_miner_reward)).toFixed(6);
                              const gas_used = t.gas_used;
                              const gas_price = parseFloat(fromGWei(t.gas_price)).toFixed(6);
                              return (
                                <>
                                  <Card.Grid
                                    style={{
                                      width: "35%",
                                      padding: "20px 12px",
                                      backgroundColor: "#c4ddef",
                                      height: "80px",
                                    }}
                                    hoverable={false}
                                  >
                                    <Tag color="blue">tx #{i}</Tag>
                                    <br />
                                    <a href={trxhashLink} target="_blank">
                                      {trxhashTxt}
                                    </a>
                                  </Card.Grid>
                                  <Card.Grid
                                    style={{
                                      width: "30%",
                                      padding: "20px 12px",
                                      backgroundColor: "#c4ddef",
                                      height: "80px",
                                    }}
                                    hoverable={false}
                                  >
                                    from address: <br />
                                    <a href={taddLink} target="_blank">
                                      {faddTxt}
                                    </a>
                                  </Card.Grid>
                                  <Card.Grid
                                    style={{
                                      width: "35%",
                                      padding: "20px 12px",
                                      backgroundColor: "#c4ddef",
                                      height: "80px",
                                    }}
                                    hoverable={false}
                                  >
                                    to address: <br />
                                    <a href={taddLink} target="_blank">
                                      {taddTxt}
                                    </a>
                                  </Card.Grid>
                                  <Card.Grid
                                    style={{ width: "35%", padding: "5px 12px", backgroundColor: "#c4ddef" }}
                                    hoverable={false}
                                  >
                                    miner reward (eth): {miner_reward}
                                  </Card.Grid>
                                  <Card.Grid
                                    style={{ width: "30%", padding: "5px 12px", backgroundColor: "#c4ddef" }}
                                    hoverable={false}
                                  >
                                    gas used: {gas_used}
                                  </Card.Grid>
                                  <Card.Grid
                                    style={{ width: "35%", padding: "5px 12px", backgroundColor: "#c4ddef" }}
                                    hoverable={false}
                                  >
                                    gas price (gwei): {gas_price}
                                  </Card.Grid>

                                  {t.logs &&
                                    t.logs.length > 0 &&
                                    t.logs.map(l => {
                                      // console.log(l)
                                      const coinadd = addressLink(l.coin.address);
                                      const cointxt = shortTxt(l.coin.address);
                                      return (
                                        <>
                                          <Card.Grid style={{ width: "100%", padding: 5 }} hoverable={false}>
                                            {l.coin.event}&nbsp;
                                            {l.coin.logo ? (
                                              <>
                                                <Space>
                                                  <a href={coinadd} target="_blank">
                                                    <img
                                                      src={l.coin.logo}
                                                      style={{
                                                        width: "1rem",
                                                        marginRight: ".25rem",
                                                      }}
                                                    />
                                                    {l.coin.name}
                                                  </a>
                                                  {l.coin.value}
                                                </Space>
                                              </>
                                            ) : (
                                              <>
                                                <Space>
                                                  <a href={coinadd} target="_blank">
                                                    {cointxt}
                                                  </a>
                                                  {l.coin.value}
                                                </Space>
                                              </>
                                            )}
                                          </Card.Grid>
                                        </>
                                      );
                                    })}
                                </>
                              );
                            })}
                        </Card>
                      </Card.Grid>
                    </>
                  );
                })}
            </Card>
          </>
        );
      },
    },
  ];

  return (
    <div className="App">
      <Layout>
        <Header style={{ padding: 5, position: "fixed", zIndex: 1, width: "100%", height: "auto", top: 0 }}>
          <HeaderSt />
          <Space></Space>
        </Header>
        <Content style={{ paddingTop: 100, paddingBottom: 50, width: "100%" }} className="">
          <div
            style={{
              width: "90%",
              margin: "auto",
              marginTop: 10,
              paddingTop: 15,
              paddingBottom: 15,
              fontWeight: "bolder",
              borderRadius: 12,
            }}
            class="grad_deeprelief"
          >
            <h3> ⚓ latest block num: {blockNum}</h3>
            <Input
              placeholder="search: block num"
              allowClear
              // defaultValue={}
              onChange={onChangeBlockNum}
              style={{ width: "50%" }}
            />
            <Button
              type={"primary"}
              onClick={() => {
                refresh();
              }}
            >
              refresh
            </Button>
            {/*<Divider />*/}
            <Table
              showHeader={false}
              columns={cols}
              rowKey="id"
              size="small"
              dataSource={BlockTrxsData}
              loading={Loading == 1 ? false : true}
              pagination={{ defaultPageSize: 1, position:["topCenter"] }}
              style={{
                padding: 10,
              }}
            />
          </div>

          <div
            style={{
              width: "90%",
              margin: "auto",
              marginTop: 10,
              padding: 10,
              fontWeight: "bolder",
              borderRadius: 12,
            }}
            class="grad_deeprelief"
          >
            <div> ****** </div>
            <div style={{ textAlign: "left" }}></div>
            <Divider />
          </div>
        </Content>
        <Footer
          style={{ padding: 5, position: "fixed", zIndex: 1, width: "100%", bottom: 0 }}
          className="grad_glasswater"
        >
          <Row align="middle" gutter={[4, 4]}>
            <Col span={12}></Col>

            <Col span={12} style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.5 }}>
                {/*<a
                  target="_blank"
                  style={{ color: "#000" }}
                  href="https://github.com/austintgriffith/scaffold-eth"
                >
                  🍴 Repo: Fork me!
                </a>
                <br />*/}
                <a
                  target="_blank"
                  style={{ color: "#000" }}
                  href="https://github.com/harryranakl/scaffold-eth/tree/flashbots-arb-bundles"
                >
                  🍴 Repo: Fork me!
                </a>
              </div>
            </Col>
          </Row>
        </Footer>
      </Layout>
    </div>
  );
}

export default App;
