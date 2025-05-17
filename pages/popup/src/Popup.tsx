import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';
  const goGithubSite = () =>
    chrome.tabs.create({ url: 'https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite' });

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/index.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  const changeZhihuStyle = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (!tab.url?.includes('zhihu.com')) {
      chrome.notifications.create('zhihu-error', {
        ...notificationOptions,
        title: '修改知乎样式错误',
        message: '请在知乎页面使用此功能！',
      });
      return;
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          // 只插入一次 style
          if (!document.getElementById('zhihu-style-extension-style')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'zhihu-style-extension-style';
            styleElement.textContent = `
              .ContentItem, .AnswerItem, .List-item, .Card, .Question-main, .Question-mainColumn, .ContentItem-meta, .RichContent, .RichContent-inner {
                width: 100% !important;
                max-width: 100% !important;
              }
              .Question-mainColumn {
                margin-right: 0 !important;
              }
              .List-item {
                padding: 0 !important;
              }
              /* 隐藏视频和图片 */
              .ContentItem img,
              .AnswerItem img,
              .ContentItem video,
              .AnswerItem video,
              .RichContent img,
              .RichContent video,
              .RichContent-inner img,
              .RichContent-inner video,
              .VideoAnswerPlayer,
              .VideoCard,
              .ZVideoItem,
              .ZVideoLinkCard,
              .VideoAnswerPlayer-video,
              .VideoAnswerPlayer-poster {
                display: none !important;
              }
              /* 隐藏右侧内容 */
              .Post-Row-Content-right {
                display: none !important;
              }
              /* 修改文章内容区域样式 */
              .Post-Row-Content-left-article {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              /* 隐藏文章内容中的媒体 */
              .Post-Row-Content-left-article img,
              .Post-Row-Content-left-article video,
              .Post-Row-Content-left-article .VideoAnswerPlayer,
              .Post-Row-Content-left-article .VideoCard,
              .Post-Row-Content-left-article .ZVideoItem,
              .Post-Row-Content-left-article .ZVideoLinkCard,
              .Post-Row-Content-left-article .VideoAnswerPlayer-video,
              .Post-Row-Content-left-article .VideoAnswerPlayer-poster {
                display: none !important;
              }
              /* 隐藏子元素 */
              .Post-Sub,
              .Post-NormalSub {
                display: none !important;
              }
            `;
            document.head.appendChild(styleElement);
            console.log('已添加全局样式');
          }

          // 节流定时器
          let styleTimer: ReturnType<typeof setTimeout> | null = null;

          // 定义样式修改函数
          const applyStyles = () => {
            // 更宽泛的 logo 选择器和特征判断，兼容 viewBox="0 0 64 30" 和 class 以 css- 开头
            const logoCandidates = Array.from(
              document.querySelectorAll(
                'header svg, .AppHeader-inner svg, a[href="/"] svg, svg[class*="logo"], svg[class^="css-"]',
              ),
            );
            let logoElement = null;
            for (const svg of logoCandidates) {
              if (
                svg instanceof SVGElement &&
                (svg.getAttribute('viewBox') === '0 0 84 32' ||
                  svg.getAttribute('viewBox') === '0 0 64 30' ||
                  (svg.className &&
                    typeof svg.className === 'object' &&
                    'baseVal' in svg.className &&
                    svg.className.baseVal.includes('logo')) ||
                  (svg.className && typeof svg.className === 'string' && svg.className.includes('logo')) ||
                  (svg.className && typeof svg.className === 'string' && svg.className.startsWith('css-')) ||
                  (svg.closest && svg.closest('a[href="/"]')))
              ) {
                logoElement = svg;
                break;
              }
            }

            if (logoElement) {
              const parent = logoElement.parentNode;
              if (parent && !parent.querySelector('img[alt="阿里语雀"]')) {
                const newLogo = document.createElement('img');
                newLogo.src =
                  'https://mdn.alipayobjects.com/huamei_0prmtq/afts/img/A*IyX5TqQXOMQAAAAAAAAAAAAADvuFAQ/original';
                newLogo.alt = '阿里语雀';
                newLogo.className = 'theme-image index-module_logo_tHEfk';
                newLogo.style.height = '28px';
                parent.replaceChild(newLogo, logoElement);
                console.log('知乎 logo 替换成功');
              }
            } else {
              console.log('未找到知乎 logo 元素');
            }

            // 修改 CSS 变量（只需设置一次即可）
            if (document.documentElement.style.getPropertyValue('--GBL01A') !== '#000000') {
              document.documentElement.style.setProperty('--GBL01A', '#000000');
              console.log('CSS 变量修改成功');
            }

            // 替换标题文本
            const titleElements = document.querySelectorAll('.QuestionHeader-title');
            if (titleElements.length > 0) {
              titleElements.forEach(element => {
                if (element.textContent !== '成功项目文档') {
                  element.textContent = '成功项目文档';
                }
              });
              console.log('标题替换成功，共替换了', titleElements.length, '个标题');
            } else {
              console.log('未找到标题元素');
            }

            // 移除右侧内容元素
            const rightContentElements = document.querySelectorAll('.Post-Row-Content-right');
            rightContentElements.forEach(element => {
              if (element.parentNode) element.parentNode.removeChild(element);
              console.log('已移除右侧内容元素');
            });

            // 移除知乎侧边栏元素
            const sideColumnElements = document.querySelectorAll('.Question-sideColumn, .Question-sideColumn--sticky');
            sideColumnElements.forEach(element => {
              if (element.parentNode) element.parentNode.removeChild(element);
              console.log('已移除知乎侧边栏元素');
            });

            // 移除子元素
            const subElements = document.querySelectorAll('.Post-Sub, .Post-NormalSub');
            subElements.forEach(element => {
              if (element.parentNode) element.parentNode.removeChild(element);
              console.log('已移除子元素');
            });

            // 修改文章内容区域
            const articleElements = document.querySelectorAll('.Post-Row-Content-left-article');
            articleElements.forEach(element => {
              if (element instanceof HTMLElement) {
                if (element.style.width !== '100%') {
                  element.style.width = '100%';
                  element.style.maxWidth = '100%';
                  element.style.margin = '0';
                  element.style.padding = '0';
                  console.log('已修改文章内容区域样式');
                }
              }
            });

            // 设置 .Question-mainColumn 宽度为 100%
            const mainColumnElements = document.querySelectorAll('.Question-mainColumn');
            mainColumnElements.forEach(element => {
              if (element instanceof HTMLElement) {
                if (element.style.width !== '100%') {
                  element.style.width = '100%';
                  element.style.maxWidth = '100%';
                  element.style.margin = '0';
                  element.style.padding = '0';
                  console.log('已将 .Question-mainColumn 宽度设置为 100%');
                }
              }
            });

            // 设置 .ListShortcut 宽度为 100%
            const listShortcutElements = document.querySelectorAll('.ListShortcut');
            listShortcutElements.forEach(element => {
              if (element instanceof HTMLElement) {
                if (element.style.width !== '100%') {
                  element.style.width = '100%';
                  element.style.maxWidth = '100%';
                  element.style.margin = '0';
                  element.style.padding = '0';
                  console.log('已将 .ListShortcut 宽度设置为 100%');
                }
              }
            });
          };

          // 立即执行一次样式修改
          applyStyles();

          // 只监听 header 或 #root，observer 回调节流
          const root = document.getElementById('root') || document.body;
          const observer = new MutationObserver(() => {
            if (styleTimer) clearTimeout(styleTimer);
            styleTimer = setTimeout(() => {
              applyStyles();
            }, 200); // 200ms 节流
          });
          observer.observe(root, {
            childList: true,
            subtree: true,
          });
          console.log('已启动自动样式修改');

          window.addEventListener('unload', () => {
            observer.disconnect();
            console.log('已停止自动样式修改');
          });

          // 注入悬浮复制按钮（只注入一次）
          if (!document.getElementById('zhihu-copy-answer-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.id = 'zhihu-copy-answer-btn';
            copyBtn.innerText = '复制答案';
            copyBtn.style.position = 'fixed';
            copyBtn.style.bottom = '40px';
            copyBtn.style.right = '40px';
            copyBtn.style.zIndex = '99999';
            copyBtn.style.background = '#1772F6';
            copyBtn.style.color = '#fff';
            copyBtn.style.border = 'none';
            copyBtn.style.borderRadius = '8px';
            copyBtn.style.padding = '12px 24px';
            copyBtn.style.fontSize = '16px';
            copyBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.opacity = '0.92';
            copyBtn.style.transition = 'opacity 0.2s';
            copyBtn.onmouseenter = () => {
              copyBtn.style.opacity = '1';
            };
            copyBtn.onmouseleave = () => {
              copyBtn.style.opacity = '0.92';
            };

            copyBtn.onclick = () => {
              const answerItems = document.querySelectorAll('.AnswerItem');
              let allText = '';
              const answerList: string[] = [];
              answerItems.forEach(item => {
                if (item instanceof HTMLElement) {
                  answerList.push(item.innerText.trim());
                  allText += item.innerText + '\n\n';
                }
              });
              if (allText.trim()) {
                navigator.clipboard.writeText(allText.trim()).then(() => {
                  copyBtn.innerText = '已复制!';
                  setTimeout(() => {
                    copyBtn.innerText = '复制答案';
                  }, 1200);
                });
                // 显示侧边栏
                let sidebar = document.getElementById('zhihu-answer-sidebar');
                if (!sidebar) {
                  sidebar = document.createElement('div');
                  sidebar.id = 'zhihu-answer-sidebar';
                  sidebar.style.position = 'fixed';
                  sidebar.style.top = '80px';
                  sidebar.style.right = '0';
                  sidebar.style.width = '400px';
                  sidebar.style.maxHeight = '80vh';
                  sidebar.style.overflowY = 'auto';
                  sidebar.style.background = '#fff';
                  sidebar.style.boxShadow = '-2px 0 12px rgba(0,0,0,0.12)';
                  sidebar.style.zIndex = '99999';
                  sidebar.style.padding = '24px 16px 16px 16px';
                  sidebar.style.borderRadius = '8px 0 0 8px';
                  sidebar.style.fontSize = '15px';
                  sidebar.style.color = '#222';
                  sidebar.style.display = 'flex';
                  sidebar.style.flexDirection = 'column';
                  sidebar.style.gap = '16px';
                  // 关闭按钮
                  const closeBtn = document.createElement('button');
                  closeBtn.innerText = '关闭';
                  closeBtn.style.position = 'absolute';
                  closeBtn.style.top = '8px';
                  closeBtn.style.right = '16px';
                  closeBtn.style.background = '#eee';
                  closeBtn.style.border = 'none';
                  closeBtn.style.borderRadius = '4px';
                  closeBtn.style.padding = '4px 10px';
                  closeBtn.style.cursor = 'pointer';
                  closeBtn.onclick = () => {
                    sidebar!.remove();
                  };
                  sidebar.appendChild(closeBtn);
                  document.body.appendChild(sidebar);
                } else {
                  // 清空旧内容（保留关闭按钮）
                  while (sidebar.childNodes.length > 1) sidebar.removeChild(sidebar.lastChild!);
                }
                // 逐条显示答案
                answerList.forEach((text, idx) => {
                  const itemDiv = document.createElement('div');
                  itemDiv.style.background = '#f6f8fa';
                  itemDiv.style.borderRadius = '6px';
                  itemDiv.style.padding = '12px 10px';
                  itemDiv.style.marginBottom = '4px';
                  itemDiv.style.whiteSpace = 'pre-wrap';
                  itemDiv.innerText = `【第${idx + 1}条】\n` + text;
                  sidebar.appendChild(itemDiv);
                });
              } else {
                copyBtn.innerText = '无答案可复制';
                setTimeout(() => {
                  copyBtn.innerText = '复制答案';
                }, 1200);
              }
            };

            document.body.appendChild(copyBtn);
            console.log('已注入知乎复制答案悬浮按钮');
          }
        },
      })
      .catch(err => {
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('zhihu-error', {
            ...notificationOptions,
            title: '修改知乎样式错误',
            message: '无法在此页面执行此操作！',
          });
        }
      });
  };

  return (
    <div
      className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}
      style={{
        minWidth: 280,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <img
        src={chrome.runtime.getURL('icon-128.png')}
        className="App-logo"
        alt="logo"
        style={{ width: 80, height: 80, marginBottom: 24 }}
      />
      <button
        className={
          'font-bold py-2 px-6 rounded shadow hover:scale-105 ' +
          (isLight ? 'bg-pink-200 text-black' : 'bg-pink-700 text-white')
        }
        style={{ fontSize: 18 }}
        onClick={changeZhihuStyle}>
        一键换装
      </button>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
