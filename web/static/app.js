/**
 * Teams Collector Dashboard
 * Frontend JavaScript for API interaction
 */

// State
let currentPage = 0;
let messagesLimit = 50;
let currentChannel = null;

// API Base URL
const API_BASE = '/api';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    loadOverview();
    checkHealth();
});

// ==================== TAB NAVIGATION ====================

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Load data for active tab
    switch(tabName) {
        case 'overview':
            loadOverview();
            break;
        case 'runs':
            loadRuns();
            break;
        case 'messages':
            loadChannels();
            break;
        case 'target-chats':
            loadTargetChats();
            break;
    }
}

// ==================== API CALLS ====================

async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return null;
    }
}

// ==================== HEALTH CHECK ====================

async function checkHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        document.getElementById('system-status').textContent = data.status === 'ok' ? 'Online' : 'Error';
        document.getElementById('system-status').style.color = data.status === 'ok' ? '#28a745' : '#dc3545';
    } catch (error) {
        document.getElementById('system-status').textContent = 'Offline';
        document.getElementById('system-status').style.color = '#dc3545';
    }
}

// ==================== OVERVIEW ====================

async function loadOverview() {
    const data = await apiGet('');

    if (!data) {
        document.getElementById('overview-runs').innerHTML = '<div class="error">Failed to load overview data</div>';
        return;
    }

    // Update stats
    document.getElementById('total-runs').textContent = data.runs?.length || 0;
    document.getElementById('recent-messages').textContent = data.messages?.length || 0;

    // Render runs
    const runsHtml = data.runs?.length > 0
        ? data.runs.map(run => renderRun(run)).join('')
        : '<div class="empty">No runs found</div>';
    document.getElementById('overview-runs').innerHTML = runsHtml;

    // Render messages
    const messagesHtml = data.messages?.length > 0
        ? data.messages.map(msg => renderMessage(msg)).join('')
        : '<div class="empty">No messages found</div>';
    document.getElementById('overview-messages').innerHTML = messagesHtml;
}

// ==================== RUNS ====================

async function loadRuns() {
    const limit = document.getElementById('runs-limit')?.value || 20;
    const data = await apiGet(`/runs?limit=${limit}&offset=0`);

    if (!data) {
        document.getElementById('runs-list').innerHTML = '<div class="error">Failed to load runs</div>';
        return;
    }

    const html = data.runs?.length > 0
        ? data.runs.map(run => renderRun(run)).join('')
        : '<div class="empty">No runs found</div>';

    document.getElementById('runs-list').innerHTML = html;
}

function renderRun(run) {
    const statusClass = `status-${run.status}`;
    const startedAt = new Date(run.started_at).toLocaleString();
    const completedAt = run.completed_at ? new Date(run.completed_at).toLocaleString() : 'N/A';

    return `
        <div class="run-item" onclick="showRunLog('${escapeHtml(run.id)}')">
            <h4>${run.id}</h4>
            <div class="run-meta">
                <span>Status: <span class="${statusClass}">${run.status}</span></span>
                <span>Profile: ${run.profile}</span>
                <span>Headless: ${run.headless ? 'Yes' : 'No'}</span>
                <span>Messages: ${run.message_count || 0}</span>
            </div>
            <div class="run-meta">
                <span>Started: ${startedAt}</span>
                <span>Completed: ${completedAt}</span>
            </div>
        </div>
    `;
}

// ==================== CHANNELS ====================

async function loadChannels() {
    // Reset state
    currentChannel = null;
    currentPage = 0;

    // Show channels view, hide messages view
    document.getElementById('channels-view').style.display = 'block';
    document.getElementById('messages-view').style.display = 'none';

    const data = await apiGet('/channels');

    if (!data) {
        document.getElementById('channels-list').innerHTML = '<div class="error">Failed to load channels</div>';
        return;
    }

    const html = data.channels?.length > 0
        ? data.channels.map(channel => renderChannel(channel)).join('')
        : '<div class="empty">No channels found</div>';

    document.getElementById('channels-list').innerHTML = html;
}

function renderChannel(channel) {
    const lastMessageTime = new Date(channel.last_message_at).toLocaleString();
    const preview = channel.last_message?.substring(0, 100) || 'No messages';

    return `
        <div class="channel-item" onclick="selectChannel('${escapeHtml(channel.channel_name)}')">
            <h4>${escapeHtml(channel.channel_name)}</h4>
            <div class="channel-meta">
                <span class="message-count">${channel.message_count} messages</span>
                <span class="last-update">${lastMessageTime}</span>
            </div>
            <div class="channel-preview">
                <span class="last-sender">${escapeHtml(channel.last_sender)}:</span>
                ${escapeHtml(preview)}
            </div>
        </div>
    `;
}

function selectChannel(channelName) {
    currentChannel = channelName;
    currentPage = 0;

    // Show messages view, hide channels view
    document.getElementById('channels-view').style.display = 'none';
    document.getElementById('messages-view').style.display = 'block';

    // Update header
    document.getElementById('channel-name-header').textContent = channelName;

    // Load messages for this channel
    loadMessagesForChannel();
}

function backToChannels() {
    loadChannels();
}

// ==================== MESSAGES ====================

async function loadMessagesForChannel() {
    if (!currentChannel) {
        backToChannels();
        return;
    }

    const limit = document.getElementById('messages-limit')?.value || 50;
    const offset = currentPage * limit;

    let endpoint = `/messages?limit=${limit}&offset=${offset}&channel=${encodeURIComponent(currentChannel)}`;

    const data = await apiGet(endpoint);

    if (!data) {
        document.getElementById('messages-list').innerHTML = '<div class="error">Failed to load messages</div>';
        return;
    }

    const html = data.messages?.length > 0
        ? data.messages.map(msg => renderMessage(msg)).join('')
        : '<div class="empty">No messages found</div>';

    document.getElementById('messages-list').innerHTML = html;

    // Update pagination
    document.getElementById('page-info').textContent = `Page ${currentPage + 1}`;
}

function renderMessage(msg) {
    const timestamp = new Date(msg.timestamp).toLocaleString();

    return `
        <div class="message-item">
            <h4><span class="message-sender">${escapeHtml(msg.sender)}</span> in ${escapeHtml(msg.channel_name || 'Unknown')}</h4>
            <div class="message-text">${escapeHtml(msg.message_text)}</div>
            <div class="message-meta">
                <span>${timestamp}</span>
                ${msg.thread_id ? `<span>Thread: ${msg.thread_id}</span>` : ''}
            </div>
        </div>
    `;
}

// ==================== SEARCH ====================

async function performSearch() {
    const query = document.getElementById('search-query').value.trim();

    if (!query) {
        alert('Please enter a search query');
        return;
    }

    const data = await apiGet(`/search?q=${encodeURIComponent(query)}&limit=50`);

    if (!data) {
        document.getElementById('search-results').innerHTML = '<div class="error">Search failed</div>';
        return;
    }

    const html = data.results?.length > 0
        ? `<p>Found ${data.count} results for "${escapeHtml(query)}"</p>` +
          data.results.map(msg => renderMessage(msg)).join('')
        : `<div class="empty">No results found for "${escapeHtml(query)}"</div>`;

    document.getElementById('search-results').innerHTML = html;
}

function handleSearchEnter(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

// ==================== PAGINATION ====================

function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        loadMessagesForChannel();
    }
}

function nextPage() {
    currentPage++;
    loadMessagesForChannel();
}

// ==================== TARGET CHATS ====================

async function loadTargetChats() {
    const data = await apiGet('/target-chats');

    if (!data) {
        document.getElementById('target-chats-list').innerHTML = '<div class="error">Failed to load target chats</div>';
        return;
    }

    const html = data.chats?.length > 0
        ? data.chats.map(chat => renderTargetChat(chat)).join('')
        : '<div class="empty">No target chats configured</div>';

    document.getElementById('target-chats-list').innerHTML = html;
}

function renderTargetChat(chat) {
    const lastScraped = chat.last_scraped_at ? new Date(chat.last_scraped_at).toLocaleString() : 'Never';
    const activeClass = chat.is_active ? 'active' : 'inactive';
    const typeLabels = { channel: 'Channel', user: 'User', group: 'Group' };

    return `
        <div class="target-chat-item ${activeClass}">
            <div class="target-chat-header">
                <h4>${escapeHtml(chat.chat_name)}</h4>
                <div class="target-chat-actions">
                    <button onclick="toggleTargetChat(${chat.id}, ${chat.is_active})" class="btn-small">
                        ${chat.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onclick="deleteTargetChatConfirm(${chat.id}, '${escapeHtml(chat.chat_name)}')" class="btn-small btn-danger">
                        Delete
                    </button>
                </div>
            </div>
            <div class="target-chat-meta">
                <span><strong>Type:</strong> ${typeLabels[chat.chat_type]}</span>
                <span><strong>Profile:</strong> ${chat.profile}</span>
                <span><strong>Priority:</strong> ${chat.priority}</span>
                <span><strong>Total Messages:</strong> ${chat.total_messages}</span>
            </div>
            <div class="target-chat-meta">
                <span><strong>Last Scraped:</strong> ${lastScraped}</span>
                <span><strong>Status:</strong> <span class="status-${activeClass}">${chat.is_active ? 'Active' : 'Inactive'}</span></span>
            </div>
            ${chat.notes ? `<div class="target-chat-notes">${escapeHtml(chat.notes)}</div>` : ''}
        </div>
    `;
}

async function addNewTargetChat() {
    const chatName = document.getElementById('new-chat-name').value.trim();
    const chatType = document.getElementById('new-chat-type').value;
    const profile = document.getElementById('new-chat-profile').value;
    const priority = parseInt(document.getElementById('new-chat-priority').value) || 0;
    const notes = document.getElementById('new-chat-notes').value.trim();

    if (!chatName) {
        alert('Chat name is required!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/target-chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_name: chatName,
                chat_type: chatType,
                profile: profile,
                is_active: 1,
                priority: priority,
                notes: notes || null
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Chat "${chatName}" added successfully!`);
            // Clear form
            document.getElementById('new-chat-name').value = '';
            document.getElementById('new-chat-notes').value = '';
            document.getElementById('new-chat-priority').value = '0';
            // Reload list
            loadTargetChats();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error adding target chat:', error);
        alert('Failed to add chat. Please try again.');
    }
}

async function toggleTargetChat(id, currentStatus) {
    const newStatus = currentStatus ? 0 : 1;

    try {
        const response = await fetch(`${API_BASE}/target-chats/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus })
        });

        const result = await response.json();

        if (response.ok) {
            loadTargetChats();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error toggling target chat:', error);
        alert('Failed to update chat. Please try again.');
    }
}

async function deleteTargetChatConfirm(id, chatName) {
    if (!confirm(`Are you sure you want to delete "${chatName}"?\n\nThis will not delete collected messages, only stop future scraping.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/target-chats/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Chat "${chatName}" deleted successfully!`);
            loadTargetChats();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error deleting target chat:', error);
        alert('Failed to delete chat. Please try again.');
    }
}

async function triggerManualScrape() {
    const profile = document.getElementById('scrape-profile').value;
    const statusDiv = document.getElementById('scrape-status');
    const button = document.querySelector('.btn-scrape');

    // Disable button
    button.disabled = true;
    button.textContent = 'Starting...';

    statusDiv.innerHTML = '<div class="status-info">⏳ Starting scraper in headless mode...</div>';

    try {
        const response = await fetch(`${API_BASE}/trigger-scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: profile })
        });

        const result = await response.json();

        if (response.ok) {
            statusDiv.innerHTML = `
                <div class="status-success">
                    ✅ ${result.message}<br>
                    <small>${result.note}</small>
                </div>
            `;

            // Reload runs efter 3 sekunder
            setTimeout(() => {
                switchTab('runs');
            }, 3000);
        } else {
            statusDiv.innerHTML = `<div class="status-error">❌ ${result.error}</div>`;
        }
    } catch (error) {
        console.error('Error triggering scrape:', error);
        statusDiv.innerHTML = '<div class="status-error">❌ Failed to start scraper. Please try again.</div>';
    } finally {
        // Re-enable button efter 5 sekunder
        setTimeout(() => {
            button.disabled = false;
            button.textContent = '▶ Start Scraping';
        }, 5000);
    }
}

// ==================== LOG MODAL ====================

async function showRunLog(runId) {
    const modal = document.getElementById('log-modal');
    const modalTitle = document.getElementById('modal-title');
    const logContent = document.getElementById('log-content');

    // Show modal
    modal.style.display = 'block';
    modalTitle.textContent = `Log for ${runId}`;
    logContent.textContent = 'Loading log...';

    try {
        const response = await fetch(`${API_BASE}/runs/${encodeURIComponent(runId)}/log`);

        if (response.ok) {
            const data = await response.json();
            logContent.textContent = data.log || 'No log content available';
        } else {
            const error = await response.json();
            logContent.textContent = `Error: ${error.error || 'Failed to load log'}`;
        }
    } catch (error) {
        console.error('Error fetching log:', error);
        logContent.textContent = 'Failed to fetch log. Please try again.';
    }
}

function closeLogModal() {
    document.getElementById('log-modal').style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('log-modal');
    if (event.target === modal) {
        closeLogModal();
    }
}

// ==================== UTILITIES ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
