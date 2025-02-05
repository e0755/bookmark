let currentFormat = 'json';
let bookmarksData = null;

// 获取DOM元素
const jsonBtn = document.getElementById('jsonBtn');
const csvBtn = document.getElementById('csvBtn');
const exportBtn = document.getElementById('exportBtn');
const preview = document.getElementById('preview');
const status = document.getElementById('status');

// 转换为Chrome书签格式
function transformToJson(bookmarks) {
  return {
    checksum: "",
    roots: {
      bookmark_bar: transformNode(bookmarks[0].children[0]),
      other: transformNode(bookmarks[0].children[1]),
      synced: {
        children: [],
        date_added: "13345559135988341",
        date_modified: "0",
        id: "3",
        name: "Mobile Bookmarks",
        type: "folder"
      }
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
function transformToCsv(bookmarks) {
  let csvContent = 'Title,URL,Tags\n';
  
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
  
  bookmarks[0].children.forEach(processNode);
  return csvContent;
}

// 更新预览区域
async function updatePreview() {
  if (!bookmarksData) {
    bookmarksData = await chrome.bookmarks.getTree();
  }

  if (currentFormat === 'json') {
    const jsonData = transformToJson(bookmarksData);
    preview.textContent = JSON.stringify(jsonData, null, 2);
    jsonBtn.classList.add('active');
    csvBtn.classList.remove('active');
  } else {
    const csvData = transformToCsv(bookmarksData);
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

    let content, fileName, type;
    if (currentFormat === 'json') {
      content = JSON.stringify(transformToJson(bookmarksData), null, 2);
      fileName = 'Bookmarks.json';
      type = 'application/json';
    } else {
      content = transformToCsv(bookmarksData);
      fileName = 'bookmarks.csv';
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