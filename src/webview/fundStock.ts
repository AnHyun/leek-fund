import Axios from 'axios';
import { ViewColumn } from 'vscode';
import ReusedWebviewPanel from './ReusedWebviewPanel';
import { LeekFundConfig } from '../shared/leekConfig';
import { randHeader } from '../shared/utils';
import { StockHoldings } from '../shared/typed';
import internal = require('stream');

const fundStockUrl = (code: string): string => {
  return `https://www.morningstar.cn/handler/quicktake.ashx?command=portfolio&fcid=${code}&randomid=${Math.random()}`;
};

async function getFundStockByCode(code: string): Promise<any> {
  try {
    const response = await Axios.get(fundStockUrl(code), {
      headers: randHeader(),
    });
    console.log(response);
   return response.data;
  } catch (err) {
    console.log(err);
    return '基金持仓获取失败';
  }
}

async function fundStock() {
  const fundCodes: string[] = LeekFundConfig.getConfig('leek-fund.starFunds') || [];
  const fundSort = LeekFundConfig.getConfig('leek-fund.starFundsSort') || 'Counts';
  console.log(fundCodes, );
  console.log(fundSort);

  // 获取所有基金持仓
  let fundStockList: any[] = [];
  let fundFetchList = fundCodes.map(code => getFundStockByCode(code));
  for await(let res of fundFetchList) {
    let stockTop10 = res.Top10StockHoldings;
    fundStockList.push(...stockTop10);
  }

  // 基金持仓去重
  let temp: any = {};
  let fundStockUniqueList = fundStockList.reduce((prev: object[], curr: StockHoldings): object[] => {
    let { Symbol, MarketValue, Percent } = curr;
    if (temp[Symbol]) {
      prev.forEach((item: any) => {
        if (item.Symbol === temp[Symbol]) {
          item.Counts += 1;
          // 市值百万乘以权重占比
          item.MarketValue +=  MarketValue * (1 / fundCodes.length) / 1000000;
          item.Percent += Percent * (1 / fundCodes.length);
        }
      });
    } else {
      curr.Counts = 1;
      // 乘以权重占比
      curr.MarketValue =  MarketValue * (1 / fundCodes.length) / 1000000;
      curr.Percent =  Percent * (1 / fundCodes.length);
      temp[Symbol] = Symbol;
      prev.push(curr);
    }
    return prev;
  }, []);

  // 排序
  fundStockUniqueList.sort((a: any, b: any) => b[fundSort] - a[fundSort]);
  fundStockUniqueList.forEach((item: any, index: number) => {
    item.id = index + 1;
    item.MarketValue =  (item.MarketValue).toFixed(2);
    item.Percent = (item.Percent).toFixed(2);

  });

  const panel = ReusedWebviewPanel.create(
    'fundStockWebview',
    `基金持仓统计`,
    ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  let content: string = '';
  for (let i = 0; i < fundStockUniqueList.length; i++) {
    let item = fundStockUniqueList[i];
    content += `<tr>
        <td>${item.id}</td><td>${item.HoldingName}</td><td>${item.Symbol}</td><td>${item.MarketValue}</td><td>${item.Percent}</td><td>${item.Counts}</td>
    </tr>`;
  }
  panel.webview.html = `<html>
    <head>
    <style type="text/css">
        table.gridtable {
            width: 100%;
            font-family: verdana,arial,sans-serif;
            font-size:12px;
            color:#333333;
            border-width: 1px;
            border-color: #666666;
            border-collapse: collapse;
        }
        table.gridtable th {
            border-width: 1px;
            padding: 8px;
            border-style: solid;
            border-color: #666666;
            background-color: #dedede;
        }
        table.gridtable td {
            border-width: 1px;
            padding: 8px;
            border-style: solid;
            border-color: #666666;
            background-color: #ffffff;
        }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <div class="history">
      <h3 style="text-align: center;">基金持仓统计</h3>
    </div>
    <table class="gridtable">
        <tr>
            <th>序号</th><th>股票名称</th><th>股票代码</th><th>市值(百万)</th><th>占净资产%(平均权重)</th><th>持股基金数</th>
        </tr>
        ${content}
    </table>
  </body>
  </html>`;
}

export default fundStock;
