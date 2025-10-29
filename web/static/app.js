/**
 * Teams Collector Dashboard
 * Frontend JavaScript for API interaction
 */

// State
let currentPage = 0;
let messagesLimit = 50;

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
            loadMessages();
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
        <div class="run-item">
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

// ==================== MESSAGES ====================

async function loadMessages() {
    const limit = document.getElementById('messages-limit')?.value || 50;
    const channel = document.getElementById('channel-filter')?.value || '';
    const offset = currentPage * limit;

    let endpoint = `/messages?limit=${limit}&offset=${offset}`;
    if (channel) {
        endpoint += `&channel=${encodeURIComponent(channel)}`;
    }

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
        loadMessages();
    }
}

function nextPage() {
    currentPage++;
    loadMessages();
}

// ==================== UTILITIES ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
