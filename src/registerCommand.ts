import { commands, ExtensionContext, window } from 'vscode';
import fundSuggestList from './data/fundSuggestData';
import { BinanceProvider } from './explorer/binanceProvider';
import BinanceService from './explorer/binanceService';
import { FundProvider } from './explorer/fundProvider';
import FundService from './explorer/fundService';
import { NewsProvider } from './explorer/newsProvider';
import { NewsService } from './explorer/newsService';
import { StockProvider } from './explorer/stockProvider';
import StockService from './explorer/stockService';
import globalState from './globalState';
import FlashNewsDaemon from './output/flash-news/FlashNewsDaemon';
import FlashNewsOutputServer from './output/flash-news/FlashNewsOutputServer';
import { LeekFundConfig } from './shared/leekConfig';
import { LeekTreeItem } from './shared/leekTreeItem';
import checkForUpdate from './shared/update';
import { colorOptionList, randomColor } from './shared/utils';
import allFundTrend from './webview/allFundTrend';
import donate from './webview/donate';
import fundFlow, { mainFundFlow } from './webview/fundFlow';
import fundHistory from './webview/fundHistory';
import fundPosition from './webview/fundPosition';
import fundRank from './webview/fundRank';
import fundTrend from './webview/fundTrend';
import leekCenterView from './webview/leekCenterView';
import openNews from './webview/news';
import setAmount from './webview/setAmount';
import stockTrend from './webview/stockTrend';
import stockTrendPic from './webview/stockTrendPic';
import tucaoForum from './webview/tucaoForum';
import fundStock from './webview/fundStock';

export function registerViewEvent(
  context: ExtensionContext,
  fundService: FundService,
  stockService: StockService,
  fundProvider: FundProvider,
  stockProvider: StockProvider,
  newsProvider: NewsProvider,
  flashNewsOutputServer: FlashNewsOutputServer,
  binanceProvider?: BinanceProvider
) {
  const leekModel = new LeekFundConfig();
  const newsService = new NewsService();
  const binanceService = new BinanceService(context);

  commands.registerCommand('leek-fund.toggleFlashNews', () => {
    const isEnable = LeekFundConfig.getConfig('leek-fund.flash-news');
    LeekFundConfig.setConfig('leek-fund.flash-news', !isEnable).then(() => {
      window.showInformationMessage(`???${isEnable ? '??????' : '??????'} OUTPUT ??? Flash News???`);
    });
  });

  commands.registerCommand('leek-fund.refreshFollow', () => {
    newsProvider.refresh();
    window.showInformationMessage(`????????????`);
  });

  commands.registerCommand('leek-fund.flash-news-show', () => {
    flashNewsOutputServer.showOutput();
  });

  // Fund operation
  commands.registerCommand('leek-fund.refreshFund', () => {
    fundProvider.refresh();
    const handler = window.setStatusBarMessage(`?????????????????????`);
    setTimeout(() => {
      handler.dispose();
    }, 1000);
  });
  commands.registerCommand('leek-fund.deleteFund', (target) => {
    LeekFundConfig.removeFundCfg(target.id, () => {
      fundProvider.refresh();
    });
  });
  commands.registerCommand('leek-fund.addFund', () => {
    /* if (!service.fundSuggestList.length) {
      service.getFundSuggestList();
      window.showInformationMessage(`???????????????????????????????????????`);
      return;
    } */

    window.showQuickPick(fundSuggestList, { placeHolder: '?????????????????????' }).then((code) => {
      if (!code) {
        return;
      }
      LeekFundConfig.updateFundCfg(code.split('|')[0], () => {
        fundProvider.refresh();
      });
    });
  });
  commands.registerCommand('leek-fund.sortFund', () => {
    fundProvider.changeOrder();
    fundProvider.refresh();
  });
  commands.registerCommand('leek-fund.sortAmountFund', () => {
    fundProvider.changeAmountOrder();
    fundProvider.refresh();
  });

  // Stock operation
  commands.registerCommand('leek-fund.refreshStock', () => {
    stockProvider.refresh();
    const handler = window.setStatusBarMessage(`?????????????????????`);
    setTimeout(() => {
      handler.dispose();
    }, 1000);
  });
  commands.registerCommand('leek-fund.deleteStock', (target) => {
    LeekFundConfig.removeStockCfg(target.id, () => {
      stockProvider.refresh();
    });
  });
  commands.registerCommand('leek-fund.leekCenterView', () => {
    if (stockService.stockList.length === 0 && fundService.fundList.length === 0) {
      window.showWarningMessage('??????????????????????????????');
      return;
    }
    leekCenterView(stockService, fundService);
  });
  commands.registerCommand('leek-fund.addStock', () => {
    // vscode QuickPick ????????????????????????????????????????????????
    // https://github.com/microsoft/vscode/issues/23633
    const qp = window.createQuickPick();
    qp.items = [{ label: '?????????????????????????????????0000001 ??? ????????????' }];
    let code: string | undefined;
    let timer: NodeJS.Timer | null = null;
    qp.onDidChangeValue((value) => {
      qp.busy = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      timer = setTimeout(async () => {
        const res = await stockService.getStockSuggestList(value);
        qp.items = res;
        qp.busy = false;
      }, 100); // ????????????
    });
    qp.onDidChangeSelection((e) => {
      if (e[0].description) {
        code = e[0].label && e[0].label.split(' | ')[0];
      }
    });
    qp.show();
    qp.onDidAccept(() => {
      if (!code) {
        return;
      }
      // ????????????????????????????????????????????????????????????????????????????????????
      const newCode = code.replace('gb', 'gb_').replace('us', 'usr_');
      LeekFundConfig.updateStockCfg(newCode, () => {
        stockProvider.refresh();
      });
      qp.hide();
      qp.dispose();
    });
  });
  commands.registerCommand('leek-fund.sortStock', () => {
    stockProvider.changeOrder();
    stockProvider.refresh();
  });

  /**
   * WebView
   */
  // ????????????
  context.subscriptions.push(
    commands.registerCommand('leek-fund.stockItemClick', (code, name, text, stockCode) =>
      stockTrend(code, name, stockCode)
    )
  );
  // ????????????
  context.subscriptions.push(
    commands.registerCommand('leek-fund.fundItemClick', (code, name) => fundTrend(code, name))
  );
  // ??????????????????????????????
  commands.registerCommand('leek-fund.viewFundHistory', (item) => fundHistory(item));
  // ????????????
  commands.registerCommand('leek-fund.viewFundPosition', (item) => fundPosition(item));
  // ??????????????????
  commands.registerCommand('leek-fund.viewFundStock', (item) => fundStock());
  // ????????????
  commands.registerCommand('leek-fund.viewFundRank', () => fundRank());
  // ???????????????
  commands.registerCommand('leek-fund.viewFundTrend', () => allFundTrend(fundService));
  // ????????????
  commands.registerCommand('leek-fund.viewFundFlow', () => fundFlow());
  commands.registerCommand('leek-fund.viewMainFundFlow', () => mainFundFlow());
  // ????????????
  commands.registerCommand('leek-fund.setFundTop', (target) => {
    LeekFundConfig.setFundTopCfg(target.id, () => {
      fundProvider.refresh();
    });
  });
  // ????????????
  commands.registerCommand('leek-fund.setStockTop', (target) => {
    LeekFundConfig.setStockTopCfg(target.id, () => {
      fundProvider.refresh();
    });
  });
  // ????????????????????????
  commands.registerCommand('leek-fund.setFundAmount', () => {
    if (fundService.fundList.length === 0) {
      window.showWarningMessage('??????????????????????????????');
      return;
    }
    setAmount(fundService);
  });
  commands.registerCommand('leek-fund.stockTrendPic', (target) => {
    const { code, name, type, symbol } = target.info;
    stockTrendPic(code, name, `${type}${symbol}`);
  });

  /**
   * News command
   */
  commands.registerCommand('leek-fund.newItemClick', (userName, userId) => {
    openNews(newsService, userId, userName);
  });
  commands.registerCommand('leek-fund.viewUserTimeline', (target) => {
    const userName = target.label;
    const userId = target.id;
    openNews(newsService, userId, userName, true);
  });

  commands.registerCommand('leek-fund.addNews', () => {
    window
      .showInputBox({ placeHolder: '?????????????????????ID????????????????????????????????????????????????' })
      .then(async (id) => {
        if (!id) {
          return;
        }
        const newsUserIds = LeekFundConfig.getConfig('leek-fund.newsUserIds') || [];
        if (newsUserIds.includes(id)) {
          window.showInformationMessage(`ID??? ${id} ?????????????????????????????????`);
          return;
        }
        try {
          const list = await newsService.getNewsUserList([id]);
          if (list.length === 1) {
            newsUserIds.push(id);
            LeekFundConfig.setConfig('leek-fund.newsUserIds', newsUserIds).then(() => {
              newsProvider.refresh();
            });
          }
        } catch (e) {
          window.showErrorMessage(`???????????????${id}???????????????`);
        }
      });
  });

  commands.registerCommand('leek-fund.deleteUser', (target) => {
    const newsUserIds = LeekFundConfig.getConfig('leek-fund.newsUserIds') || [];
    const newIds = newsUserIds.filter((id: string) => id !== target.id);
    LeekFundConfig.setConfig('leek-fund.newsUserIds', newIds).then(() => {
      newsProvider.refresh();
    });
  });

  commands.registerCommand('leek-fund.setXueqiuCookie', (target) => {
    window
      .showInputBox({
        placeHolder:
          '?????????????????????????????????????????????????????? Cookie????????????????????????F12??????>NetWork ?????????????????? Cookie ??????',
      })
      .then(async (cookieString = '') => {
        const cookie = cookieString.trim();
        if (!cookie) {
          return;
        }
        console.log(cookie);
        LeekFundConfig.setConfig('leek-fund.xueqiuCookie', cookie).then(() => {
          newsProvider.refresh();
        });
      });
  });

  /**
   * Binance command
   */
  commands.registerCommand('leek-fund.refreshBinance', () => {
    binanceProvider?.refresh();
  });

  /* ??????????????? */
  commands.registerCommand('leek-fund.addBinancePair', async () => {
    const pairsList = await binanceService.getParis();
    window.showQuickPick(pairsList, { placeHolder: '??????????????????' }).then((pair) => {
      if (!pair) return;
      LeekFundConfig.updateBinanceCfg(pair, () => binanceProvider?.refresh());
    });
  });

  /* ??????????????? */
  commands.registerCommand('leek-fund.deletePair', (target) => {
    LeekFundConfig.removeBinanceCfg(target.id, () => {
      binanceProvider?.refresh();
    });
  });

  /* ??????????????? */
  commands.registerCommand('leek-fund.setPairTop', (target) => {
    LeekFundConfig.setBinanceTopCfg(target.id, () => {
      binanceProvider?.refresh();
    });
  });
  /**
   * Settings command
   */
  context.subscriptions.push(
    commands.registerCommand('leek-fund.hideText', () => {
      fundService.toggleLabel();
      stockService.toggleLabel();
      fundProvider.refresh();
      stockProvider.refresh();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('leek-fund.setStockStatusBar', () => {
      const stockList = stockService.stockList;
      const stockNameList = stockList.map((item: LeekTreeItem) => {
        return {
          label: `${item.info.name}`,
          description: `${item.info.code}`,
        };
      });
      window
        .showQuickPick(stockNameList, {
          placeHolder: '???????????????????????????????????????4??????',
          canPickMany: true,
        })
        .then((res) => {
          if (!res) {
            res = [];
          }
          let codes = res.map((item) => item.description);
          if (codes.length > 4) {
            codes = codes.slice(0, 4);
          }
          LeekFundConfig.updateStatusBarStockCfg(codes, () => {
            const handler = window.setStatusBarMessage(`????????????????????????`);
            setTimeout(() => {
              handler.dispose();
            }, 1500);
          });
        });
    })
  );

  context.subscriptions.push(
    commands.registerCommand('leek-fund.customSetting', () => {
      const colorList = colorOptionList();
      window
        .showQuickPick(
          [
            { label: '?????????????????????', description: 'statusbar-stock' },
            { label: '?????????????????????????????????????', description: 'statusbar-rise' },
            { label: '?????????????????????????????????????', description: 'statusbar-fall' },
            { label: '??????&????????????????????????', description: 'icontype' },
            { label: '??????????/????????????', description: 'hideText' },
            {
              label: globalState.showEarnings ? '????????????' : '????????????????',
              description: 'earnings',
            },
            {
              label: globalState.remindSwitch ? '????????????' : '???????????????????',
              description: 'remindSwitch',
            },
          ],
          {
            placeHolder: '???????????????????????????',
          }
        )
        .then((item: any) => {
          if (!item) {
            return;
          }
          const type = item.description;
          // ?????????????????????
          if (type === 'statusbar-rise' || type === 'statusbar-fall') {
            window
              .showQuickPick(colorList, {
                placeHolder: `???????????????????????????${item.label}???`,
              })
              .then((colorItem: any) => {
                if (!colorItem) {
                  return;
                }
                let color = colorItem.description;
                if (color === 'random') {
                  color = randomColor();
                }
                LeekFundConfig.setConfig(
                  type === 'statusbar-rise' ? 'leek-fund.riseColor' : 'leek-fund.fallColor',
                  color
                );
              });
          } else if (type === 'statusbar-stock') {
            // ?????????????????????
            commands.executeCommand('leek-fund.setStockStatusBar');
          } else if (type === 'icontype') {
            // ??????&??????????????????
            window
              .showQuickPick(
                [
                  {
                    label: '????????????',
                    description: 'arrow',
                  },
                  {
                    label: '????????????1????????????????????????',
                    description: 'food1',
                  },
                  {
                    label: '????????????2????????????????????????',
                    description: 'food2',
                  },
                  {
                    label: '????????????3?????????????????????',
                    description: 'food3',
                  },
                  {
                    label: '??????????????????????????????????????????',
                    description: 'iconfood',
                  },
                ],
                {
                  placeHolder: `????????????????????????&??????????????????`,
                }
              )
              .then((iconItem: any) => {
                if (!iconItem) {
                  return;
                }
                if (globalState.iconType !== iconItem.description) {
                  LeekFundConfig.setConfig('leek-fund.iconType', iconItem.description);
                  globalState.iconType = iconItem.description;
                }
              });
          } else if (type === 'earnings') {
            const newValue = globalState.showEarnings === 1 ? 0 : 1;
            LeekFundConfig.setConfig('leek-fund.showEarnings', newValue);
            globalState.showEarnings = newValue;
          } else if (type === 'hideText') {
            commands.executeCommand('leek-fund.hideText');
          } else if (type === 'remindSwitch') {
            commands.executeCommand('leek-fund.toggleRemindSwitch');
          }
        });
    })
  );

  context.subscriptions.push(
    commands.registerCommand('leek-fund.openConfigPage', () => {
      commands.executeCommand('workbench.action.openSettings', '@ext:giscafer.leek-fund');
    })
  );

  context.subscriptions.push(commands.registerCommand('leek-fund.donate', () => donate(context)));
  context.subscriptions.push(commands.registerCommand('leek-fund.tucaoForum', () => tucaoForum()));

  context.subscriptions.push(
    commands.registerCommand('leek-fund.toggleRemindSwitch', (on?: number) => {
      const newValue = on !== undefined ? (on ? 1 : 0) : globalState.remindSwitch === 1 ? 0 : 1;
      LeekFundConfig.setConfig('leek-fund.stockRemindSwitch', newValue);
      globalState.remindSwitch = newValue;
    })
  );

  context.subscriptions.push(
    commands.registerCommand('leek-fund.changeStatusBarItem', (stockId) => {
      const stockList = stockService.stockList;
      const stockNameList = stockList
        .filter((stock) => stock.id !== stockId)
        .map((item: LeekTreeItem) => {
          return {
            label: `${item.info.name}`,
            description: `${item.info.code}`,
          };
        });

      window
        .showQuickPick(stockNameList, {
          placeHolder: '?????????????????????',
        })
        .then((res) => {
          if (!res) return;
          const statusBarStocks = LeekFundConfig.getConfig('leek-fund.statusBarStock');
          const newCfg = [...statusBarStocks];
          const newStockId = res.description;
          const index = newCfg.indexOf(stockId);
          if (statusBarStocks.includes(newStockId)) {
            window.showWarningMessage(`???${res.label}??????????????????`);
            return;
          }
          if (index > -1) {
            newCfg[newCfg.indexOf(stockId)] = res.description;
          }
          LeekFundConfig.updateStatusBarStockCfg(newCfg, () => {
            const handler = window.setStatusBarMessage(`????????????????????????`);
            setTimeout(() => {
              handler.dispose();
            }, 1500);
          });
        });
    })
  );

  context.subscriptions.push(
    commands.registerCommand('leek-fund.immersiveBackground', (isChecked: boolean) => {
      LeekFundConfig.setConfig('leek-fund.immersiveBackground', isChecked);
      globalState.immersiveBackground = isChecked;
    })
  );
  context.subscriptions.push(
    commands.registerCommand('leek-fund.switchStatusBarVisible', () => {
      LeekFundConfig.setConfig(
        'leek-fund.hideStatusBar',
        !LeekFundConfig.getConfig('leek-fund.hideStatusBar')
      );
    })
  );
  checkForUpdate();
}
