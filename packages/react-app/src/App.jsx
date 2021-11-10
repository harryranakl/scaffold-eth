import { Row, Col, Layout, Card, Space, Divider, Radio, Input, Button, Table, Alert, List, PageHeader } from "antd";
import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import { INFURA_ID, NETWORK, NETWORKS, ALCHEMY_KEY } from "./constants";

const { ethers } = require("ethers");

const { Header, Footer, Content } = Layout;
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

// const scaffoldEthProvider =
  // new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544");
const poktMainnetProvider =
  new ethers.providers.StaticJsonRpcProvider(
      "https://eth-mainnet.gateway.pokt.network/v1/lb/61853c567335c80036054a2b",
    );
const mainnetInfura =
  new ethers.providers.StaticJsonRpcProvider(`https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`);

const gasConverter = (g,t) => {
  let gm,gs,gd;
  if(t == 3) gm = g * 1000000000;
  if(t == 4) gm = g * 100000000;
  if(t == 12) gm = g;
  if(t == 14) {
    gs = g.toString();
    if(gs.length == 12) gm = g;
    if(gs.length == 13) gm = g/10;
    if(gs.length == 14) gm = g/100;
  }
  
  gd = parseInt(gm, 10) / 10 ** 9;
  return parseFloat(gd).toFixed(0);
};

function App(props) {
  // const mainnetProvider = scaffoldEthProvider && scaffoldEthProvider._network ? scaffoldEthProvider : null;
  const mainnetProvider = mainnetInfura;

  const [blockNum, setBlockNum] = useState(0);
  const [Loading, setLoading] = useState(0);

  const [gasPricesGS, setGasPricesGS] = useState({});
  const [gasPricesBS, setGasPricesBS] = useState({});
  const [gasPricesGNO, setGasPricesGNO] = useState({});
  const [gasPricesMS, setGasPricesMS] = useState({});
  const [gasPricesEC, setGasPricesEC] = useState({});
  const [gasPricesGP, setGasPricesGP] = useState({});
  const [gasPricesGT, setGasPricesGT] = useState({});

  const ethgasAPI = "https://ethgasstation.info/json/ethgasAPI.json";
  const blockscoutAPI = "https://blockscout.com/eth/mainnet/api/v1/gas-price-oracle";
  const gnosisAPI = "https://safe-relay.gnosis.io/api/v1/gas-station/";
  const metaswapAPI = "https://api.metaswap.codefi.network/gasPrices";
  const etherchainAPI = "https://www.etherchain.org/api/gasnow";
  const gaspriceAPI = "https://api.gasprice.io/v1/estimates";
  const txpriceAPI = "https://api.txprice.com/";
// gasPrices(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_APIKEY}`, true);
  const getGasPrices = () => {
    axios
      .get(ethgasAPI)
      .then(response => {
        const { data } = response;
        const { average, fast, fastest } = data;
        const gasObj = {
          average: gasConverter(average,4),
          fast: gasConverter(fast,4),
          fastest: gasConverter(fastest,4),
        };
        setGasPricesGS(gasObj);
      })
      .catch(error => console.log(error));

    axios
      .get(blockscoutAPI)
      .then(response => {
        const { data } = response;
        const { slow, average, fast } = data;
        const gasObj = {
          slow: gasConverter(slow,3),
          average: gasConverter(average,3),
          fast: gasConverter(fast,3)
        };
        setGasPricesBS(gasObj);
      })
      .catch(error => console.log(error));

    axios
      .get(gnosisAPI)
      .then(response => {
        const { data } = response;
        const { standard, fast, fastest } = data;
        const gasObj = {
          average: gasConverter(standard,12),
          fast: gasConverter(fast,12),
          fastest: gasConverter(fastest,14),
        };
        setGasPricesGNO(gasObj);
      })
      .catch(error => console.log(error));

    axios
      .get(metaswapAPI)
      .then(response => {
        const { data } = response;
        const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = data;
        const gasObj = {
          average: gasConverter(SafeGasPrice,3),
          fast: gasConverter(ProposeGasPrice,3),
          fastest: gasConverter(FastGasPrice,3),
        };
        setGasPricesMS(gasObj);
      })
      .catch(error => console.log(error));

    axios
      .get(etherchainAPI)
      .then(response => {
        const { data } = response;
        const { standard, fast, rapid } = data.data;
        const gasObj = {
          average: gasConverter(standard,12),
          fast: gasConverter(fast,12),
          fastest: gasConverter(rapid,12),
        };
        setGasPricesEC(gasObj);
      })
      .catch(error => console.log(error));

    axios
      .get(gaspriceAPI)
      .then(response => {
        const { data } = response;
        const { eco, fast, instant } = data.result;
        const gasObj = {
          average: gasConverter(eco.feeCap,3),
          fast: gasConverter(fast.feeCap,3),
          fastest: gasConverter(instant.feeCap,3),
        };
        setGasPricesGP(gasObj);
      })
      .catch(error => console.log(error));

    axios
      .get(txpriceAPI)
      .then(response => {
        const { data } = response;
        const { blockPrices } = data;
        const { estimatedPrices} = blockPrices[0];

        const gasObj = {
          fast: gasConverter(estimatedPrices[2].price,3),
          fastest: gasConverter(estimatedPrices[0].price,3),
        };
        setGasPricesGT(gasObj);
      })
      .catch(error => console.log(error));
  };

  const init = () => {
    getGasPrices();
  };

  useOnBlock(mainnetProvider, async () => {
    await setLoading(0);
    // console.log(mainnetProvider)
    const bn = await mainnetProvider._lastBlockNumber;
    setBlockNum(bn);
    init();
    await setLoading(1);
  });

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  return (
    <div className="App">
      <Layout>
        <Header
          style={{ 
            padding: 0, 
            position: "fixed", 
            zIndex: 1, 
            width: "100%", 
            height: "auto", 
            top: 0 
          }}
        >
          <a href="/" target="_blank" rel="noopener noreferrer">
            <PageHeader title="🏗 scaffold-eth" subTitle="gas api" style={{ cursor: "pointer" }} />
          </a>
        </Header>
        <Content style={{ paddingTop: 150, paddingBottom: 50, width: "100%" }} className="">
          <div
            style={{
              width: "auto",
              // margin: "auto",
              margin: 10,
              padding: 10,
              fontWeight: "bolder",
              borderRadius: 12,
            }}
            class="grad_deeprelief"
          >
            <h3> ⚓ latest block num: {blockNum}</h3>
            <Divider />

            <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
            <span> ⛽️ (eth gas station):</span>
            </Col>
            <Col span={16}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button
                value={gasPricesGS && gasPricesGS.average}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#2FB999",
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>average</div>
                <div style={{ fontSize: 20 }}>{gasPricesGS && gasPricesGS.average}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesGS && gasPricesGS.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#456cda", //0237CC
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fast</div>
                <div style={{ fontSize: 20 }}>{gasPricesGS && gasPricesGS.fast}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesGS && gasPricesGS.fastest}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#dc658d", //FF558F
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fastest</div>
                <div style={{ fontSize: 20 }}>{gasPricesGS && gasPricesGS.fastest}</div>
              </Radio.Button>
            </Radio.Group>
            </Col>
            </Row>

            <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
            <span> ⛽️ (block scout):</span>
            </Col>
            <Col span={16}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button
                value={gasPricesBS && gasPricesBS.average}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#2FB999",
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>average</div>
                <div style={{ fontSize: 20 }}>{gasPricesBS && gasPricesBS.average}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesBS && gasPricesBS.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#456cda", //0237CC
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fast</div>
                <div style={{ fontSize: 20 }}>{gasPricesBS && gasPricesBS.fast}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesBS && gasPricesBS.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#dc658d", //FF558F
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fastest</div>
                <div style={{ fontSize: 20 }}>{gasPricesBS && gasPricesBS.fast}</div>
              </Radio.Button>
            </Radio.Group>
            </Col>
            </Row>

            <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
            <span> ⛽️ (gnosis):</span>
            </Col>
            <Col span={16}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button
                value={gasPricesGNO && gasPricesGNO.average}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#2FB999",
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>average</div>
                <div style={{ fontSize: 20 }}>{gasPricesGNO && gasPricesGNO.average}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesGNO && gasPricesGNO.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#456cda", //0237CC
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fast</div>
                <div style={{ fontSize: 20 }}>{gasPricesGNO && gasPricesGNO.fast}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesGNO && gasPricesGNO.fastest}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#dc658d", //FF558F
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fastest</div>
                <div style={{ fontSize: 20 }}>{gasPricesGNO && gasPricesGNO.fastest}</div>
              </Radio.Button>
            </Radio.Group>
            </Col>
            </Row>

            <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
            <span> ⛽️ (metaswap):</span>
            </Col>
            <Col span={16}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button
                value={gasPricesMS && gasPricesMS.average}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#2FB999",
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>average</div>
                <div style={{ fontSize: 20 }}>{gasPricesMS && gasPricesMS.average}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesMS && gasPricesMS.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#456cda", //0237CC
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fast</div>
                <div style={{ fontSize: 20 }}>{gasPricesMS && gasPricesMS.fast}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesMS && gasPricesMS.fastest}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#dc658d", //FF558F
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fastest</div>
                <div style={{ fontSize: 20 }}>{gasPricesMS && gasPricesMS.fastest}</div>
              </Radio.Button>
            </Radio.Group>
            </Col>
            </Row>

            <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
            <span> ⛽️ (etherchain):</span>
            </Col>
            <Col span={16}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button
                value={gasPricesEC && gasPricesEC.average}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#2FB999",
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>average</div>
                <div style={{ fontSize: 20 }}>{gasPricesEC && gasPricesEC.average}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesEC && gasPricesEC.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#456cda", //0237CC
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fast</div>
                <div style={{ fontSize: 20 }}>{gasPricesEC && gasPricesEC.fast}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesEC && gasPricesEC.fastest}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#dc658d", //FF558F
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fastest</div>
                <div style={{ fontSize: 20 }}>{gasPricesEC && gasPricesEC.fastest}</div>
              </Radio.Button>
            </Radio.Group>
            </Col>
            </Row>

            <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
            <span> ⛽️ (gasprice.io):</span>
            </Col>
            <Col span={16}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button
                value={gasPricesGP && gasPricesGP.average}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#2FB999",
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>average</div>
                <div style={{ fontSize: 20 }}>{gasPricesGP && gasPricesGP.average}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesGP && gasPricesGP.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#456cda", //0237CC
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fast</div>
                <div style={{ fontSize: 20 }}>{gasPricesGP && gasPricesGP.fast}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesGP && gasPricesGP.fastest}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#dc658d", //FF558F
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fastest</div>
                <div style={{ fontSize: 20 }}>{gasPricesGP && gasPricesGP.fastest}</div>
              </Radio.Button>
            </Radio.Group>
            </Col>
            </Row>

            <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
            <span> ⛽️ (txprice):</span>
            </Col>
            <Col span={16}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button
                value={gasPricesGT && gasPricesGT.fast}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#456cda", //0237CC
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fast</div>
                <div style={{ fontSize: 20 }}>{gasPricesGT && gasPricesGT.fast}</div>
              </Radio.Button>
              <Radio.Button
                value={gasPricesGT && gasPricesGT.fastest}
                style={{
                  margin: 10,
                  padding: 15,
                  backgroundColor: "#dc658d", //FF558F
                  borderRadius: 4,
                  width: "100px",
                  height: "100px",
                }}
              >
                <div style={{ fontSize: 15 }}>fastest</div>
                <div style={{ fontSize: 20 }}>{gasPricesGT && gasPricesGT.fastest}</div>
              </Radio.Button>
            </Radio.Group>
            </Col>
            </Row>
            
          </div>

          <div
            style={{
              width: "auto",
              // margin: "auto",
              margin: 10,
              padding: 10,
              fontWeight: "bolder",
              borderRadius: 12,
            }}
            class="grad_deeprelief"
          >
            <div> ****** </div>
            <div style={{ textAlign: "left" }}>
              
            </div>
          </div>
        </Content>
        <Footer
          style={{ padding: 5, position: "fixed", zIndex: 1, width: "100%", bottom: 0 }}
          className="grad_glasswater"
        >
          <Row align="middle" gutter={[4, 4]}>
            <Col span={12}>
            </Col>

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
                  href="https://github.com/harryranakl/compare-gas-apis"
                >
                  🍴 Repo: Fork me!
                </a>
              </div>
            </Col>
          </Row>
          {/*<ThemeSwitch />*/}
        </Footer>
      </Layout>
    </div>
  );
}

export default App;
