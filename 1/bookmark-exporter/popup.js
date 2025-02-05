let currentFormat = 'json';
let bookmarksData = null;
let searchKeyword = '';

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