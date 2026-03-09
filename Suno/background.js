// Background service worker - handles tab communication & song data extraction
var STUDIO_API = 'https://studio-api.prod.suno.com';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'openSunoCreate') {
    chrome.tabs.query({ url: 'https://suno.com/*' }, (tabs) => {
      const createTab = tabs.find(t => t.url?.includes('/create'));
      if (createTab) {
        chrome.tabs.update(createTab.id, { active: true });
        chrome.tabs.sendMessage(createTab.id, { action: 'fillFromStorage' });
      } else {
        chrome.tabs.create({ url: 'https://suno.com/create' });
      }
    });
  }

  if (msg.action === 'fetchClipData') {
    fetchClipData(msg.clipId)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function fetchClipData(clipId) {
  // Strategy A: Get auth token from cookies, call Studio API
  var token = await getClerkToken();

  if (token) {
    // Try feed/v2 endpoint (most reliable per suno-api project)
    try {
      var feedRes = await fetch(STUDIO_API + '/api/feed/v2?ids=' + clipId, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/json'
        }
      });
      if (feedRes.ok) {
        var feedData = await feedRes.json();
        var clips = Array.isArray(feedData) ? feedData : (feedData.clips || [feedData]);
        if (clips.length > 0 && clips[0] && (clips[0].metadata || clips[0].title)) {
          return clips[0];
        }
      }
    } catch (e) {}

    // Try clip endpoint
    try {
      var clipRes = await fetch(STUDIO_API + '/api/clip/' + clipId, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/json'
        }
      });
      if (clipRes.ok) {
        var clipData = await clipRes.json();
        var clip = clipData.clip || clipData;
        if (clip && (clip.metadata || clip.title)) return clip;
      }
    } catch (e) {}
  }

  // Strategy B: Open song page in background tab, extract rendered DOM
  return await fetchViaBackgroundTab(clipId);
}

async function getClerkToken() {
  try {
    // Get __session cookie from suno.com (Clerk stores JWT here)
    var cookies = await chrome.cookies.getAll({ domain: '.suno.com' });
    for (var i = 0; i < cookies.length; i++) {
      if (cookies[i].name === '__session') {
        return cookies[i].value;
      }
    }
    // Also check clerk.suno.com
    var clerkCookies = await chrome.cookies.getAll({ domain: '.clerk.suno.com' });
    for (var j = 0; j < clerkCookies.length; j++) {
      if (clerkCookies[j].name === '__session' || clerkCookies[j].name === '__client') {
        return clerkCookies[j].value;
      }
    }

    // Try to get token from active Suno tab's localStorage
    var tabs = await chrome.tabs.query({ url: 'https://suno.com/*' });
    if (tabs.length > 0) {
      var results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: function() {
          return localStorage.getItem('__clerk_db_jwt')
            || sessionStorage.getItem('__clerk_db_jwt')
            || null;
        }
      });
      if (results && results[0] && results[0].result) {
        return results[0].result.replace(/"/g, '');
      }
    }
  } catch (e) {}
  return null;
}

async function fetchViaBackgroundTab(clipId) {
  var tab = await chrome.tabs.create({
    url: 'https://suno.com/song/' + clipId,
    active: false
  });

  try {
    await waitForTabLoad(tab.id, 20000);
    await new Promise(r => setTimeout(r, 4000));

    var results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFromRenderedPage
    });

    if (results && results[0] && results[0].result) {
      var data = results[0].result;
      if (data.title || data.lyrics || data.style) {
        data.id = clipId;
        data.url = 'https://suno.com/song/' + clipId;
        return data;
      }
    }
    throw new Error('No data on page');
  } finally {
    try { chrome.tabs.remove(tab.id); } catch (e) {}
  }
}

function waitForTabLoad(tabId, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, timeout);

    function listener(id, changeInfo) {
      if (id === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timer);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function extractFromRenderedPage() {
  var result = {
    title: '', lyrics: '', style: '', exclude: '',
    prompt: '', audioUrl: '', duration: '', model: '', createdAt: ''
  };

  // 1) __NEXT_DATA__
  var nextEl = document.getElementById('__NEXT_DATA__');
  if (nextEl) {
    try {
      var nd = JSON.parse(nextEl.textContent);
      var clip = nd.props?.pageProps?.clip || nd.props?.pageProps?.song;
      if (clip && clip.metadata) {
        result.title = clip.title || clip.display_name || '';
        result.lyrics = clip.metadata?.prompt || clip.lyrics || '';
        result.style = clip.metadata?.tags || clip.style || '';
        result.exclude = clip.metadata?.negative_tags || clip.negative_tags || '';
        result.prompt = clip.metadata?.gpt_description_prompt || '';
        result.audioUrl = clip.audio_url || '';
        result.duration = clip.duration || '';
        result.model = clip.model_name || clip.major_model_version || '';
        result.createdAt = clip.created_at || '';
        return result;
      }
    } catch (e) {}
  }

  // 2) React fiber traversal
  var allEls = document.querySelectorAll('[class]');
  for (var i = 0; i < Math.min(allEls.length, 300); i++) {
    var elKeys = Object.keys(allEls[i]);
    for (var k = 0; k < elKeys.length; k++) {
      if (elKeys[k].startsWith('__reactFiber$')) {
        var node = allEls[i][elKeys[k]];
        for (var d = 0; d < 30 && node; d++) {
          if (node.memoizedProps) {
            var c = node.memoizedProps.clip || node.memoizedProps.song || node.memoizedProps.data;
            if (c && typeof c === 'object' && c.metadata) {
              result.title = c.title || c.display_name || '';
              result.lyrics = c.metadata?.prompt || c.lyrics || '';
              result.style = c.metadata?.tags || c.style || '';
              result.exclude = c.metadata?.negative_tags || c.negative_tags || '';
              result.prompt = c.metadata?.gpt_description_prompt || '';
              result.audioUrl = c.audio_url || '';
              result.duration = c.duration || '';
              result.model = c.model_name || c.major_model_version || '';
              result.createdAt = c.created_at || '';
              if (result.title || result.lyrics || result.style) return result;
            }
          }
          node = node.return;
        }
      }
    }
  }

  // 3) DOM text scraping
  var h1 = document.querySelector('h1');
  if (h1) result.title = h1.textContent.trim();

  var allText = document.body.querySelectorAll('div, section, p, span, pre');
  for (var j = 0; j < allText.length; j++) {
    var el = allText[j];
    var t = (el.textContent || '').trim();
    if (!t || t.length < 3 || t.length > 5000) continue;
    if (!result.lyrics && t.includes('\n') && t.split('\n').filter(function(l) { return l.trim(); }).length > 3) {
      result.lyrics = t;
    }
  }

  return result;
}
