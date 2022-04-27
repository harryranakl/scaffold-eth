// App.jsx
import { Row, Col, Layout, Space, Divider, Button, Input, Table, Typography, Image, Tag } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import "antd/dist/antd.css";
import "./App.css";
import { HeaderSt } from "./components";
import { INFURA_ID, ETHERSCAN_KEY, NETWORK, NETWORKS } from "./constants";
import { useLocalStorage, usePoller } from "./hooks";

const { ethers } = require("ethers");
const axios = require("axios");
const { Header, Footer, Content } = Layout;
const { Paragraph, Text } = Typography;
const { TextArea } = Input;

// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

// const scaffoldEthProvider = navigator.onLine ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544") : null;
// const poktMainnetProvider = navigator.onLine ? new ethers.providers.StaticJsonRpcProvider("https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406") : null;
// const mainnetInfura = navigator.onLine ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID) : null;
const etherscanProvider = navigator.onLine ? new ethers.providers.EtherscanProvider("homestead", ETHERSCAN_KEY) : null;

let addArr = [];
const readAddlist = async () => {
  const config = {
    timeout: 30000,
    url: "https://raw.githubusercontent.com/harryranakl/scaffold-eth/wild-west-metaverse-decode-messages/packages/react-app/list.json",
    method: "get",
    responseType: "json",
  };

  const {
    data: { data },
  } = await axios(config);
  if (data) addArr = data;
};
readAddlist();

const txLink = (_tx, r) => `https://etherscan.io/tx/${r ? _tx.substr(0, _tx.length - 2) : _tx}`;
const addressLink = _a => `https://etherscan.io/address/${_a}`;
const shortTxt = _t => `${_t.substr(0, 50)}..`;

const fromWei = i => {
  return i / 10 ** 18;
};
const fromGWei = i => {
  return i / 10 ** 9;
};
const toGWei = i => {
  return i * 10 ** 9;
};

function App(props) {
  const mainnetProvider = etherscanProvider;

  // dune query
  // SELECT *
  // FROM ethereum.transactions
  // WHERE "to" = CONCAT('\x', substring('0xc8a65fadf0e0ddaf421f28feab69bf6e2e589963' from 3))::bytea

  const [Address, setAddress] = useState("0xc8a65fadf0e0ddaf421f28feab69bf6e2e589963");
  const [MessagesData, setMessagesData] = useState([]);
  const [TrxsData, setTrxsData] = useLocalStorage("trxs");
  const [Loading, setLoading] = useState(0);
  const [Anim, setAnim] = useState("blink_eff");

  const onChangeAddress = async e => {
    let a = e.target.value;
    // console.log('value --', a);
    try {
      a = ethers.utils.getAddress(a);
      if (a != Address) {
        await setTrxsData([]);
        await setAddress(a);
      }
    } catch (e) {
      // console.log(e)
    }
  };
  const readMessages = async () => {
    let trxs;
    await setLoading(0);
    if (!TrxsData || TrxsData.length == 0) {
      trxs = await mainnetProvider.getHistory(Address);
      setTrxsData(trxs);
    } else {
      trxs = TrxsData;
      // trxs.length = 20;
    }
    trxs = trxs.filter(t => {
      let data = "";
      try {
        data = ethers.utils.toUtf8String(t.data);
      } catch (e) {
        // console.log(e);
      }
      return t.type == 0 && data != "";
    });
    setMessagesData(trxs);
    await setLoading(1);
  };

  const onRefresh = async () => {
    await setTrxsData([]);
  };

  useEffect(() => {
    if (Address) {
      readMessages();
    }
  }, [TrxsData]);

  setTimeout(() => {
    setAnim("hide_eff");
  }, 3500);

  const cols = [
    {
      title: "details",
      dataIndex: "blockNumber",
      key: "blockNumber",
      width: "80%",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.blockNumber - b.blockNumber,
      render: (text, record, index) => {
        // console.log(record);
        let trxhash = record.hash;
        let tx = txLink(trxhash);
        let txTxt = shortTxt(trxhash);

        let data = "",
          val = 0,
          trxFee = 0,
          gas = 0,
          gasEth = 0,
          gasGwei = 0,
          gasLimit = 0,
          timestamp = "",
          self = "";
        try {
          data = ethers.utils.toUtf8String(record.data);
        } catch (e) {
          // console.log(e);
        }

        try {
          val = fromWei(ethers.BigNumber.from(record.value.hex).toString());
          val = val > 0 ? parseFloat(val).toFixed(10) : 0;
        } catch (e) {
          // console.log(e);
        }
        try {
          gas = ethers.BigNumber.from(record.gasPrice.hex).toString();
          gasGwei = fromGWei(gas);
          gasEth = fromWei(gas);
          gasEth = gasEth > 0 ? parseFloat(gasEth).toFixed(10) : 0;
        } catch (e) {
          // console.log(e);
        }
        try {
          gasLimit = ethers.BigNumber.from(record.gasLimit.hex).toString();
        } catch (e) {
          // console.log(e);
        }
        try {
          trxFee = gasEth * gasLimit;
          trxFee = trxFee > 0 ? parseFloat(trxFee).toFixed(10) : 0;
        } catch (e) {
          // console.log(e);
        }
        try {
          timestamp = Date(record.timestamp).toString();
        } catch (e) {
          // console.log(e);
        }

        if (record.from == record.to) {
          self = "self";
        }

        return (
          <>
            <Text style={{ width: "100%" }}>
              {self && (
                <span
                  style={{
                    background: "#9cb8e0",
                    padding: "4px",
                    borderRadius: "4px",
                    border: "1px solid",
                  }}
                >
                  {self}
                </span>
              )}
            </Text>
            <TextArea
              autoSize
              value={data}
              style={self ? { padding: "4px", background: "#9cb8e0", border: "1px solid" } : { padding: "4px" }}
            />
            <Text style={{ overflowWrap: "anywhere", fontSize: 12 }}>
              value: {val} eth
              <br />
              trx fee: {trxFee} eth
              <br />
              gas price: {gasEth} eth {gasGwei} gwei
              <br />
              gas limit: {gasLimit}
              <br />
              timestamp: {timestamp}
              <br />
              <a href={tx} target="_blank">
                trx hash:{txTxt}
              </a>
            </Text>
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
              padding: 10,
              fontWeight: "bolder",
              borderRadius: 12,
            }}
            class="grad_deeprelief"
          >
            <div> ****** </div>
            <div style={{ textAlign: "center" }}>
              🤠 welcome to eth wild west: fun way to explore and decode metaverse messages
            </div>
            <Image
              width={"80%"}
              className={Anim}
              preview={false}
              src="https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/04966628057451.5828873d7aa7d.png"
              // style={{
              //   margin: "auto",
              //   marginTop: 10,
              //   padding: 10,
              // }}
            />
            <Space direction="vertical" size={[3,3]}>
              { addArr &&
                addArr.length > 0 &&
                addArr.map(a => {
                  return (
                    <>
                      <Space style={{ textAlign: "center", fontSize: 12 }}>
                        {a.add}
                        <Tag>
                          <a href={a.link} target="_blank">
                            {a.tag} {a.dat}
                          </a>
                        </Tag>
                      </Space>
                    </>
                  );
                })
              }
            </Space>
          </div>

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
            <h3>♦ enter address:</h3>
            <Input
              placeholder="address: 0x"
              allowClear
              defaultValue={Address}
              onChange={onChangeAddress}
              style={{ width: "80%" }}
            />
            <Button
              style={{
                backgroundColor: "#1890ff",
                borderRadius: 4,
                marginLeft: 5,
              }}
              onClick={onRefresh}
            >
              refresh
            </Button>
            <Divider />
            <h3> 💬 messages: </h3>
            <Table
              showHeader={false}
              columns={cols}
              rowKey="id"
              size="small"
              dataSource={MessagesData}
              loading={Loading == 1 ? false : true}
              pagination={{ defaultPageSize: 50 }}
              style={{
                padding: 10,
              }}
            />
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
                  href="https://github.com/harryranakl/scaffold-eth/tree/wild-west-metaverse-decode-messages"
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
