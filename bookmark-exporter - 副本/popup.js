let currentFormat = 'json';
let bookmarksData = null;
let searchKeyword = '';
let checkResults = [];

// 获取DOM元素
const jsonBtn = document.getElementById('jsonBtn');
const csvBtn = document.getElementById('csvBtn');
const exportBtn = document.getElementById('exportBtn');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const searchInput = document.getElementById('searchInput');
const filterInfo = document.getElementById('filterInfo');
const bookmarkBar = document.getElementById('bookmarkBar');
const otherBookmarks = document.getElementById('otherBookmarks');
const mobileBookmarks = document.getElementById('mobileBookmarks');

// 工具相关DOM元素
const toolsBtn = document.getElementById('toolsBtn');
const toolsModal = document.getElementById('toolsModal');
const closeBtn = document.querySelector('.close-button');
const duplicateCheckBtn = document.getElementById('duplicateCheckBtn');
const deadlinkCheckBtn = document.getElementById('deadlinkCheckBtn');
const aiCategoryBtn = document.getElementById('aiCategoryBtn');
const progressBar = document.querySelector('.progress-bar-fill');
const checkStatus = document.getElementById('checkStatus');
const categoryPreview = document.getElementById('categoryPreview');

// 定义基础分类
const CATEGORIES = {
  "开发技术": {
    subCategories: ["编程语言", "框架文档", "开发工具", "技术博客", "API文档", "代码仓库"],
    keywords: ["github", "stackoverflow", "dev", "api", "docs", "developer", "programming"]
  },
  "工作效率": {
    subCategories: ["协作工具", "项目管理", "文档工具", "在线办公", "效率软件"],
    keywords: ["trello", "notion", "office", "docs", "sheets", "slides"]
  },
  "学习教育": {
    subCategories: ["在线课程", "教育平台", "学术资源", "知识库", "教程文档"],
    keywords: ["course", "learn", "edu", "tutorial", "study", "mooc"]
  },
  "媒体资源": {
    subCategories: ["图片素材", "视频资源", "音频内容", "设计资源", "字体图标"],
    keywords: ["image", "video", "audio", "design", "font", "icon", "stock"]
  },
  "社交网络": {
    subCategories: ["社交平台", "论坛社区", "博客平台", "即时通讯"],
    keywords: ["social", "forum", "blog", "chat", "community"]
  },
  "新闻资讯": {
    subCategories: ["科技新闻", "行业资讯", "财经新闻", "媒体网站"],
    keywords: ["news", "tech", "finance", "media", "press"]
  },
  "工具服务": {
    subCategories: ["在线工具", "云服务", "网络服务", "系统工具"],
    keywords: ["tool", "cloud", "service", "system", "online"]
  },
  "购物消费": {
    subCategories: ["电商平台", "数字产品", "生活服务", "支付金融"],
    keywords: ["shop", "store", "mall", "pay", "buy", "market"]
  },
  "娱乐休闲": {
    subCategories: ["游戏", "影视", "音乐", "阅读"],
    keywords: ["game", "movie", "music", "read", "play", "fun"]
  }
};

// 获取选中的书签分类
function getSelectedCategories() {
  return {
    bookmarkBar: bookmarkBar.checked,
    otherBookmarks: otherBookmarks.checked,
    mobileBookmarks: mobileBookmarks.checked
  };
}

// 转换为Chrome书签格式
function transformToJson(bookmarks, filter = false) {
  const filteredData = filter ? filterBookmarks(bookmarks) : bookmarks;
  const categories = getSelectedCategories();
  
  return {
    checksum: "",
    roots: {
      bookmark_bar: categories.bookmarkBar ? transformNode(filteredData[0].children[0]) : { children: [] },
      other: categories.otherBookmarks ? transformNode(filteredData[0].children[1]) : { children: [] },
      synced: categories.mobileBookmarks ? {
        children: [],
        date_added: "13345559135988341",
        date_modified: "0",
        id: "3",
        name: "Mobile Bookmarks",
        type: "folder"
      } : { children: [] }
    },
    version: 1
  };
}

// 转换节点格式
function transformNode(node) {
  if (!node) return null;

  const baseNode = {
    date_added: (new Date(node.dateAdded || Date.now()).getTime() * 1000).toString(),
    date_modified: "0",
    id: node.id || "1",
    name: node.title || "",
  };

  if (node.url) {
    return {
      ...baseNode,
      type: "url",
      url: node.url
    };
  } else {
    return {
      ...baseNode,
      type: "folder",
      children: Array.isArray(node.children) ? node.children.map(transformNode) : []
    };
  }
}

// 转换为CSV格式
function transformToCsv(bookmarks, filter = false) {
  let csvContent = 'Title,URL,Tags\n';
  const filteredData = filter ? filterBookmarks(bookmarks) : bookmarks;
  const categories = getSelectedCategories();
  
  function processNode(node) {
    if (node.url) {
      // 处理标题中的引号
      const title = node.title.replace(/"/g, '""');
      csvContent += `"${title}","${node.url}",""\n`;
    }
    if (node.children) {
      node.children.forEach(processNode);
    }
  }
  
  if (categories.bookmarkBar && filteredData[0].children[0]) {
    processNode(filteredData[0].children[0]);
  }
  if (categories.otherBookmarks && filteredData[0].children[1]) {
    processNode(filteredData[0].children[1]);
  }
  
  return csvContent;
}

// 过滤书签
function filterBookmarks(bookmarks) {
  if (!searchKeyword) return bookmarks;

  const keyword = searchKeyword.toLowerCase();
  let matchCount = 0;

  function filterNode(node) {
    if (!node) return null;

    // 检查当前节点是否匹配
    const titleMatch = node.title?.toLowerCase().includes(keyword);
    const urlMatch = node.url?.toLowerCase().includes(keyword);

    if (node.url) {
      // 如果是书签节点
      if (titleMatch || urlMatch) {
        matchCount++;
        return { ...node };
      }
      return null;
    } else {
      // 如果是文件夹节点
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter(child => child !== null);

      if (filteredChildren && filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    }
  }

  const filteredTree = [{
    ...bookmarks[0],
    children: bookmarks[0].children.map(filterNode).filter(child => child !== null)
  }];

  // 更新过滤信息
  updateFilterInfo(matchCount);

  return filteredTree;
}

// 更新过滤信息
function updateFilterInfo(matchCount) {
  if (!searchKeyword) {
    filterInfo.textContent = '';
  } else {
    filterInfo.textContent = `找到 ${matchCount} 个匹配的书签`;
  }
}

// 更新预览区域
async function updatePreview() {
  if (!bookmarksData) {
    bookmarksData = await chrome.bookmarks.getTree();
  }

  if (currentFormat === 'json') {
    const jsonData = transformToJson(bookmarksData, !!searchKeyword);
    preview.textContent = JSON.stringify(jsonData, null, 2);
    jsonBtn.classList.add('active');
    csvBtn.classList.remove('active');
  } else {
    const csvData = transformToCsv(bookmarksData, !!searchKeyword);
    preview.textContent = csvData;
    csvBtn.classList.add('active');
    jsonBtn.classList.remove('active');
  }
}

// 导出文件
async function exportFile() {
  try {
    if (!bookmarksData) {
      bookmarksData = await chrome.bookmarks.getTree();
    }

    // 生成时间戳
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0')
    ].join('');

    let content, fileName, type;
    if (currentFormat === 'json') {
      content = JSON.stringify(transformToJson(bookmarksData, !!searchKeyword), null, 2);
      fileName = `bookmarks_${timestamp}.json`;
      type = 'application/json';
    } else {
      content = transformToCsv(bookmarksData, !!searchKeyword);
      fileName = `bookmarks_${timestamp}.csv`;
      type = 'text/csv';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    
    await chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true
    });
    
    status.textContent = '导出成功！';
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出失败:', error);
    status.textContent = '导出失败: ' + error.message;
  }
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 搜索处理函数
const handleSearch = debounce(async (e) => {
  searchKeyword = e.target.value.trim();
  await updatePreview();
}, 300);

// 事件监听
jsonBtn.addEventListener('click', () => {
  currentFormat = 'json';
  updatePreview();
});

csvBtn.addEventListener('click', () => {
  currentFormat = 'csv';
  updatePreview();
});

exportBtn.addEventListener('click', exportFile);
searchInput.addEventListener('input', handleSearch);

// 添加分类选择的事件监听
bookmarkBar.addEventListener('change', updatePreview);
otherBookmarks.addEventListener('change', updatePreview);
mobileBookmarks.addEventListener('change', updatePreview);

// 工具相关函数
function showModal() {
  toolsModal.style.display = 'block';
}

function hideModal() {
  toolsModal.style.display = 'none';
  progressBar.style.width = '0%';
  checkStatus.textContent = '';
  categoryPreview.style.display = 'none';
  checkResults = [];
}

// 更新进度条
function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  progressBar.style.width = `${percentage}%`;
}

// 批量处理辅助函数
async function processBatch(items, batchSize, processFunc) {
  const total = items.length;
  const batches = Math.ceil(total / batchSize);
  let processed = 0;

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, total);
    const batch = items.slice(start, end);
    
    await Promise.all(batch.map(async (item) => {
      await processFunc(item);
      processed++;
      updateProgress(processed, total);
    }));

    // 每批处理完后暂停一下，避免浏览器卡死
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// 检测重复书签
async function checkDuplicateBookmarks() {
  try {
    checkResults = [];
    progressBar.style.width = '0%';
    checkStatus.textContent = '正在检测重复书签...';
    
    const bookmarks = await chrome.bookmarks.getTree();
    const urlMap = new Map();
    const allBookmarks = [];
    let removedBookmarks = [];

    // 首先收集所有书签
    function collectBookmarks(node, path = []) {
      const currentPath = [...path, node.title];
      if (node.url) {
        allBookmarks.push({
          id: node.id,
          title: node.title,
          url: node.url,
          path: currentPath.join(' > '),
          dateAdded: node.dateAdded
        });
      }
      if (node.children) {
        node.children.forEach(child => collectBookmarks(child, currentPath));
      }
    }

    bookmarks[0].children.forEach(node => collectBookmarks(node));

    // 按URL分组
    for (const bookmark of allBookmarks) {
      if (!urlMap.has(bookmark.url)) {
        urlMap.set(bookmark.url, []);
      }
      urlMap.get(bookmark.url).push(bookmark);
    }

    // 找出重复项
    const duplicates = Array.from(urlMap.entries())
      .filter(([_, items]) => items.length > 1)
      .map(([url, items]) => ({
        url,
        items: items.sort((a, b) => b.dateAdded - a.dateAdded)
      }));

    // 分批处理重复项
    await processBatch(duplicates, 10, async (duplicate) => {
      const keepItem = duplicate.items[0];
      const removeItems = duplicate.items.slice(1);
      
      removedBookmarks.push({
        type: 'duplicate',
        kept: keepItem,
        removed: removeItems,
        reason: '重复URL'
      });

      // 删除重复项
      for (const item of removeItems) {
        try {
          await chrome.bookmarks.remove(item.id);
        } catch (error) {
          console.error('删除书签失败:', error);
        }
      }
    });

    // 保存删除记录
    if (removedBookmarks.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupContent = JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'duplicate_removal',
        removedItems: removedBookmarks
      }, null, 2);
      
      const blob = new Blob([backupContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: `bookmark_duplicate_backup_${timestamp}.json`,
        saveAs: true
      });

      URL.revokeObjectURL(url);
    }

    checkStatus.textContent = `已清理 ${removedBookmarks.length} 组重复书签，备份文件已保存。`;
    setTimeout(hideModal, 3000);
  } catch (error) {
    console.error('检测重复书签失败:', error);
    checkStatus.textContent = '检测失败: ' + error.message;
  }
}

// 检测无效链接
async function checkDeadLinks() {
  try {
    checkResults = [];
    progressBar.style.width = '0%';
    checkStatus.textContent = '正在检测无效链接...';

    const bookmarks = await chrome.bookmarks.getTree();
    const links = [];
    let removedBookmarks = [];

    // 收集所有链接
    function collectLinks(node, path = []) {
      const currentPath = [...path, node.title];
      if (node.url) {
        // 过滤掉非http/https链接和特殊链接
        if ((node.url.startsWith('http://') || node.url.startsWith('https://')) &&
            !node.url.startsWith('chrome://') &&
            !node.url.startsWith('edge://') &&
            !node.url.startsWith('about:') &&
            !node.url.startsWith('file://')) {
          links.push({
            id: node.id,
            url: node.url,
            title: node.title,
            path: currentPath.join(' > ')
          });
        }
      }
      if (node.children) {
        node.children.forEach(child => collectLinks(child, currentPath));
      }
    }

    bookmarks[0].children.forEach(node => collectLinks(node));

    const total = links.length;
    let processed = 0;
    let currentBatch = 0;
    const batchSize = 20; // 增加并发数
    const timeoutMs = 3000; // 减少超时时间到3秒

    // 更新状态显示
    function updateStatus() {
      const percent = Math.round((processed / total) * 100);
      progressBar.style.width = `${percent}%`;
      checkStatus.textContent = `正在检测: ${processed}/${total} (${percent}%)`;
    }

    // 检查单个链接
    async function checkLink(link) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // 使用Image对象检查图片链接
        if (link.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              clearTimeout(timeoutId);
              resolve(true);
            };
            img.onerror = () => {
              clearTimeout(timeoutId);
              resolve(false);
            };
            img.src = link.url;
            setTimeout(() => {
              img.src = '';
              resolve(false);
            }, timeoutMs);
          });
        }

        // 对于其他链接使用fetch
        const response = await fetch(link.url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        return false;
      }
    }

    // 处理一批链接
    async function processBatch(startIndex) {
      const endIndex = Math.min(startIndex + batchSize, links.length);
      const batch = links.slice(startIndex, endIndex);
      const results = await Promise.all(
        batch.map(async (link) => {
          const isValid = await checkLink(link);
          if (!isValid) {
            removedBookmarks.push({
              ...link,
              reason: '无法访问'
            });
            try {
              await chrome.bookmarks.remove(link.id);
            } catch (error) {
              console.error('删除书签失败:', error);
            }
          }
          processed++;
          updateStatus();
          return isValid;
        })
      );
      return results;
    }

    // 分批处理所有链接
    while (currentBatch < links.length) {
      await processBatch(currentBatch);
      currentBatch += batchSize;
      // 每批处理后短暂暂停，避免过度占用资源
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 保存删除记录
    if (removedBookmarks.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupContent = JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'deadlink_removal',
        removedItems: removedBookmarks
      }, null, 2);
      
      const blob = new Blob([backupContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: `bookmark_deadlink_backup_${timestamp}.json`,
        saveAs: true
      });

      URL.revokeObjectURL(url);
    }

    checkStatus.textContent = `已清理 ${removedBookmarks.length} 个无效链接，备份文件已保存。`;
    setTimeout(hideModal, 3000);
  } catch (error) {
    console.error('检测无效链接失败:', error);
    checkStatus.textContent = '检测失败: ' + error.message;
  }
}

// 修改AI调用函数
async function callZhipuAI(prompt) {
  const API_KEY = "879cae3ffc2b44f7a6d1f6cfefa9f667.2eQ1Le1n0zKeK5eL";
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v3/model-api/chatglm_turbo/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        prompt: [{
          role: "user",
          content: prompt
        }],
        temperature: 0.3,
        top_p: 0.7,
        request_id: Date.now().toString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI响应:', data);

    if (!data.data || !data.data.choices || !data.data.choices[0] || !data.data.choices[0].content) {
      throw new Error('AI返回格式错误');
    }

    const result = data.data.choices[0].content.trim();
    console.log('AI分类结果:', result);
    return result;
  } catch (error) {
    console.error('AI调用失败:', error);
    throw error;
  }
}

// 修改分类处理逻辑
async function processBookmarkCategory(bookmark, categorizedBookmarks) {
  try {
    const prompt = generatePrompt(bookmark);
    const result = await callZhipuAI(prompt);
    
    // 验证返回结果格式
    if (!result || !result.includes('|')) {
      console.error('AI返回格式不正确:', result);
      return false;
    }

    // 清理分类名称中的引号和多余空格
    const [mainCategory, subCategory] = result.split('|')
      .map(s => s.trim().replace(/^["']|["']$/g, ''));
    
    console.log('处理分类结果:', { mainCategory, subCategory });
    
    // 验证分类是否存在
    if (!CATEGORIES[mainCategory]) {
      console.error('未知主分类:', mainCategory);
      return false;
    }

    if (!CATEGORIES[mainCategory].subCategories.includes(subCategory)) {
      console.error('未知子分类:', subCategory);
      return false;
    }

    // 添加到分类结果中
    if (!categorizedBookmarks[mainCategory]) {
      categorizedBookmarks[mainCategory] = {};
    }
    if (!categorizedBookmarks[mainCategory][subCategory]) {
      categorizedBookmarks[mainCategory][subCategory] = [];
    }
    
    categorizedBookmarks[mainCategory][subCategory].push(bookmark);
    return true;
  } catch (error) {
    console.error('处理书签分类失败:', error, bookmark);
    return false;
  }
}

// 修改智能分类功能
async function aiCategorizeBookmarks() {
  try {
    checkResults = [];
    progressBar.style.width = '0%';
    checkStatus.textContent = '正在进行智能分类...';
    categoryPreview.style.display = 'block';
    categoryPreview.textContent = '';

    const bookmarks = await chrome.bookmarks.getTree();
    console.log('获取到的书签树:', bookmarks);

    // 获取书签栏ID
    const bookmarkBarId = bookmarks[0].children[0].id;
    console.log('书签栏ID:', bookmarkBarId);

    // 首先合并现有的重复文件夹
    checkStatus.textContent = '正在合并重复文件夹...';
    await mergeFolders(bookmarks);
    console.log('文件夹合并完成');

    // 重新获取合并后的书签树
    const updatedBookmarks = await chrome.bookmarks.getTree();
    
    // 检查现有文件夹
    const existingFolders = new Map();
    
    async function checkExistingFolders(node) {
      if (!node.url) { // 是文件夹
        existingFolders.set(node.title, {
          id: node.id,
          children: node.children || []
        });
      }
      if (node.children) {
        for (const child of node.children) {
          await checkExistingFolders(child);
        }
      }
    }

    // 检查现有文件夹结构
    await checkExistingFolders(updatedBookmarks[0]);
    console.log('现有文件夹:', existingFolders);
    
    const allBookmarks = [];
    const categorizedBookmarks = {};
    let processedCount = 0;
    let successCount = 0;

    // 初始化分类结构
    for (const category of Object.keys(CATEGORIES)) {
      categorizedBookmarks[category] = {};
      for (const subCategory of CATEGORIES[category].subCategories) {
        categorizedBookmarks[category][subCategory] = [];
      }
    }

    // 收集所有书签
    function collectBookmarks(node, path = []) {
      const currentPath = [...path, node.title];
      if (node.url) {
        allBookmarks.push({
          id: node.id,
          title: node.title,
          url: node.url,
          path: currentPath.join(' > '),
          parentId: node.parentId
        });
      }
      if (node.children) {
        node.children.forEach(child => collectBookmarks(child, currentPath));
      }
    }

    updatedBookmarks[0].children.forEach(node => collectBookmarks(node));
    console.log('收集到的书签数量:', allBookmarks.length);

    // 分批处理书签
    const batchSize = 5;
    for (let i = 0; i < allBookmarks.length; i += batchSize) {
      const batch = allBookmarks.slice(i, i + batchSize);
      await Promise.all(batch.map(async (bookmark) => {
        const success = await processBookmarkCategory(bookmark, categorizedBookmarks);
        if (success) successCount++;
        
        processedCount++;
        const progress = (processedCount / allBookmarks.length) * 100;
        progressBar.style.width = `${progress}%`;
        checkStatus.textContent = `正在分类: ${processedCount}/${allBookmarks.length} (${Math.round(progress)}%)`;
        
        // 更新预览
        let previewText = '分类预览：\n\n';
        for (const [category, subCategories] of Object.entries(categorizedBookmarks)) {
          if (Object.values(subCategories).some(bookmarks => bookmarks.length > 0)) {
            previewText += `${category}\n`;
            for (const [subCategory, bookmarks] of Object.entries(subCategories)) {
              if (bookmarks.length > 0) {
                previewText += `  ${subCategory} (${bookmarks.length})\n`;
              }
            }
            previewText += '\n';
          }
        }
        categoryPreview.textContent = previewText;
      }));

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 创建或获取文件夹并移动书签
    checkStatus.textContent = '正在整理文件夹结构...';
    for (const [category, subCategories] of Object.entries(categorizedBookmarks)) {
      let mainFolderId;
      
      // 检查主分类文件夹是否已存在
      if (existingFolders.has(category)) {
        mainFolderId = existingFolders.get(category).id;
        console.log(`使用现有主分类文件夹: ${category} (${mainFolderId})`);
      } else {
        // 创建主分类文件夹
        const mainFolder = await chrome.bookmarks.create({
          parentId: bookmarkBarId,
          title: category
        });
        mainFolderId = mainFolder.id;
        existingFolders.set(category, {
          id: mainFolderId,
          children: []
        });
        console.log(`创建新主分类文件夹: ${category} (${mainFolderId})`);
      }

      // 获取主文件夹下的所有子文件夹
      const subFolders = new Map();
      const mainFolderNode = await chrome.bookmarks.getSubTree(mainFolderId);
      if (mainFolderNode[0].children) {
        mainFolderNode[0].children.forEach(child => {
          if (!child.url) { // 是文件夹
            subFolders.set(child.title, child.id);
          }
        });
      }

      for (const [subCategory, bookmarks] of Object.entries(subCategories)) {
        if (bookmarks.length > 0) {
          let subFolderId;
          
          // 检查子分类文件夹是否已存在
          if (subFolders.has(subCategory)) {
            subFolderId = subFolders.get(subCategory);
            console.log(`使用现有子分类文件夹: ${subCategory} (${subFolderId})`);
          } else {
            // 创建子分类文件夹
            const subFolder = await chrome.bookmarks.create({
              parentId: mainFolderId,
              title: subCategory
            });
            subFolderId = subFolder.id;
            console.log(`创建新子分类文件夹: ${subCategory} (${subFolderId})`);
          }

          // 移动书签
          for (const bookmark of bookmarks) {
            try {
              console.log(`移动书签: ${bookmark.title} 到 ${category}/${subCategory}`);
              await chrome.bookmarks.move(bookmark.id, {
                parentId: subFolderId
              });
            } catch (error) {
              console.error('移动书签失败:', error, bookmark);
            }
          }
        }
      }
    }

    checkStatus.textContent = `分类完成！成功分类 ${successCount} 个书签。`;
    setTimeout(hideModal, 3000);
  } catch (error) {
    console.error('智能分类失败:', error);
    checkStatus.textContent = '分类失败: ' + error.message;
  }
}

// 合并文件夹函数
async function mergeFolders(bookmarks) {
  const folderMap = new Map(); // 用于存储相同名称的文件夹
  const processedFolders = new Set(); // 用于记录已处理的文件夹ID

  // 收集所有文件夹
  function collectFolders(node, path = []) {
    if (!node.url) { // 是文件夹
      const folderPath = [...path, node.title].join(' > ');
      if (!folderMap.has(node.title)) {
        folderMap.set(node.title, []);
      }
      folderMap.get(node.title).push({
        id: node.id,
        title: node.title,
        path: folderPath,
        children: node.children || []
      });
    }
    if (node.children) {
      node.children.forEach(child => collectFolders(child, [...path, node.title]));
    }
  }

  // 合并文件夹内容
  async function mergeFolder(folders) {
    if (folders.length <= 1) return;

    // 选择保留的文件夹（第一个遇到的）
    const keepFolder = folders[0];
    const mergeFolders = folders.slice(1);

    for (const folder of mergeFolders) {
      if (processedFolders.has(folder.id)) continue;

      // 移动所有子项到保留的文件夹
      for (const child of folder.children) {
        try {
          if (!processedFolders.has(child.id)) {
            await chrome.bookmarks.move(child.id, {
              parentId: keepFolder.id
            });
          }
        } catch (error) {
          console.error('移动失败:', error, child);
        }
      }

      // 标记为已处理
      processedFolders.add(folder.id);

      // 删除空文件夹
      try {
        await chrome.bookmarks.remove(folder.id);
      } catch (error) {
        console.error('删除文件夹失败:', error, folder);
      }
    }
  }

  // 收集所有文件夹
  bookmarks[0].children.forEach(node => collectFolders(node));

  // 处理重复文件夹
  for (const [folderName, folders] of folderMap.entries()) {
    if (folders.length > 1) {
      console.log(`合并文件夹: ${folderName}`, folders);
      await mergeFolder(folders);
    }
  }
}

// 生成AI提示词
function generatePrompt(bookmark) {
  const categoriesText = Object.entries(CATEGORIES)
    .map(([category, info]) => `${category}：${info.subCategories.join('、')}`)
    .join('\n');

  return `作为网址分类助手，请将以下网址分类到最合适的类别：

标题：${bookmark.title}
URL：${bookmark.url}

可选类别：
${categoriesText}

请只返回一个分类结果，格式如下：
主类别|子类别

注意：
1. 只返回一个最匹配的类别组合
2. 使用竖线|分隔主类别和子类别
3. 不要返回其他内容`;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    bookmarksData = await chrome.bookmarks.getTree();
    updatePreview();
  } catch (error) {
    console.error('获取书签失败:', error);
    status.textContent = '获取书签失败: ' + error.message;
  }
});

// 事件监听
toolsBtn.addEventListener('click', showModal);
closeBtn.addEventListener('click', hideModal);
duplicateCheckBtn.addEventListener('click', async () => {
  if (confirm('系统将自动清理重复书签，并保存备份文件。是否继续？')) {
    await checkDuplicateBookmarks();
  }
});
deadlinkCheckBtn.addEventListener('click', async () => {
  if (confirm('系统将自动清理无效链接，并保存备份文件。是否继续？')) {
    await checkDeadLinks();
  }
});
aiCategoryBtn.addEventListener('click', async () => {
  if (confirm('系统将使用AI对书签进行智能分类，可能需要一些时间。是否继续？')) {
    await aiCategorizeBookmarks();
  }
});

// 点击模态框外部关闭
window.addEventListener('click', (event) => {
  if (event.target === toolsModal) {
    hideModal();
  }
}); 