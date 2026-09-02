
    const switchTab = (tabId) => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      event.target.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');
    };

    let adminToken = localStorage.getItem('adminToken') || '';
    const expiryStr = localStorage.getItem('adminExpiry');
    
    // Check if session exists and is valid
    if (adminToken && expiryStr && parseInt(expiryStr) > Date.now()) {
      document.getElementById('login-modal').style.display = 'none';
      loadStatus();
      loadTeams();
      setInterval(loadStatus, 2000);
    }

    const loginAdmin = async () => {
      const pass = document.getElementById('admin-pass').value;
      if (!pass) return;

      try {
        const res = await fetch('http://localhost:3000/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pass })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          adminToken = data.token;
          
          // Set 20 min expiry
          localStorage.setItem('adminToken', adminToken);
          localStorage.setItem('adminExpiry', (Date.now() + 20 * 60 * 1000).toString());
          
          document.getElementById('login-modal').style.display = 'none';
          document.getElementById('admin-error').style.display = 'none';
          loadStatus();
          loadTeams(); 
          setInterval(loadStatus, 2000);
        } else {
          document.getElementById('admin-error').textContent = data.error || 'Login Failed';
          document.getElementById('admin-error').style.display = 'block';
        }
      } catch (e) {
        document.getElementById('admin-error').textContent = 'Server Error';
        document.getElementById('admin-error').style.display = 'block';
      }
    };

    const getHeaders = () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    });

    let adminTimeRemaining = 0;
    let localTimerInterval = null;

    const startLocalTimer = () => {
      if (localTimerInterval) clearInterval(localTimerInterval);
      localTimerInterval = setInterval(() => {
        if (adminTimeRemaining > 0) {
          adminTimeRemaining -= 1000;
          const mins = Math.floor(adminTimeRemaining / 60000);
          const secs = Math.floor((adminTimeRemaining % 60000) / 1000);
          document.getElementById('admin-timer').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
          document.getElementById('admin-timer').textContent = "00:00";
        }
      }, 1000);
    };

    const startRound = async () => {
      const durationMins = document.getElementById('duration-input').value;
      if (!durationMins || durationMins <= 0) return alert("Please enter a valid duration.");
      if (!confirm(`Are you sure you want to start the timer for ${durationMins} minutes?`)) return;
      try {
        const res = await fetch('http://localhost:3000/api/admin/start', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ durationMins: parseInt(durationMins, 10) })
        });
        if (res.ok) {
          loadStatus();
        } else {
          alert('Failed to start round.');
        }
      } catch (e) {
        console.error(e);
      }
    };

    const loadStatus = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/admin/status', { headers: getHeaders() });
        if (res.status === 401) {
          // Token expired or invalid, reset
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminExpiry');
          document.getElementById('login-modal').style.display = 'flex';
          return;
        }
        const data = await res.json();

        // Update Event Status & Timer
        document.getElementById('event-status-text').textContent = data.status;
        document.getElementById('event-status-text').style.color = data.status === 'ACTIVE' ? '#28a745' : '#ffc107';
        
        // Only resync the base timer from server to avoid local jitter, let setInterval handle the ticks
        if (Math.abs(adminTimeRemaining - data.timeRemaining) > 3000) {
            adminTimeRemaining = data.timeRemaining;
        }
        if (!localTimerInterval) startLocalTimer();
        
        if (data.status === 'ACTIVE') {
            document.getElementById('start-controls').style.display = 'none';
        } else {
            document.getElementById('start-controls').style.display = 'block';
        }
        
        document.getElementById('round-status').textContent = data.status;
        const mins = Math.floor(data.timeRemaining / 60000);
        document.getElementById('time-remaining').textContent = `${mins}m left`;
        
        document.getElementById('stat-qualified').textContent = `${data.qualifiedCount} / ${data.maxQualifiers}`;
        document.getElementById('stat-submissions').textContent = data.submissions;

        // Render hints
        const hintGrid = document.getElementById('hint-controls');
        hintGrid.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
          const qId = `Q${i}`;
          const isEnabled = data.hints[qId];
          const btn = document.createElement('button');
          btn.className = `hint-btn ${isEnabled ? 'hint-on' : 'hint-off'}`;
          btn.textContent = `${qId}: ${isEnabled ? 'ON' : 'OFF'}`;
          btn.onclick = () => toggleHint(qId, !isEnabled);
          hintGrid.appendChild(btn);
        }

        // Render log
        const tbody = document.getElementById('log-table');
        tbody.innerHTML = '';
        data.qualificationsTable.forEach(s => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>#${s.rank}</td>
            <td>${s.teamId}</td>
            <td>${new Date(s.timestamp).toLocaleTimeString()}</td>
            <td class="status-${s.status}">${s.status}</td>
          `;
          tbody.appendChild(tr);
        });

      } catch(e) {
        console.error('loadStatus error:', e);
      }
    };

    const toggleHint = async (qId, enable) => {
      await fetch('http://localhost:3000/api/admin/hints', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ questionId: qId, enabled: enable })
      });
      loadStatus();
    };

    const loadTeams = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/admin/teams', { headers: getHeaders() });
        const teams = await res.json();
        const tbody = document.getElementById('teams-tbody');
        tbody.innerHTML = '';
        teams.forEach(t => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${t.team_id}</td><td>${t.pass}</td><td style="font-family:monospace;">${t.correct_code}</td>`;
          tbody.appendChild(tr);
        });
      } catch (e) {
        console.error(e);
      }
    };
  