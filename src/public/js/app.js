// Warrigal Park FC Web Application Client-Side Logic

let currentTeamId = null;
let allTeams = [];
let allMembers = [];
let allRegistrations = [];

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadHealth();
    loadTeams();
    loadRegistrations();
    loadMembers();
});

// Tab Navigation
function initTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

            btn.classList.add('active');
            const target = btn.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');

            if (target === 'tab-roster') loadTeams();
            if (target === 'tab-registration') loadRegistrations();
            if (target === 'tab-members') loadMembers();
            if (target === 'tab-config') loadHealth();
        });
    });
}

// Alerts
function showAlert(message, type = 'success') {
    const box = document.getElementById('alert-box');
    box.className = `alert-box ${type}`;
    box.textContent = message;
    box.classList.remove('hidden');
    setTimeout(() => {
        box.classList.add('hidden');
    }, 6000);
}

// Health Check
async function loadHealth() {
    try {
        const res = await fetch('/api/health');
        const data = await res.json();
        document.getElementById('health-json').textContent = JSON.stringify(data, null, 2);
        const envBadge = document.getElementById('env-badge');
        if (envBadge) envBadge.textContent = `ENV: ${data.environment.toUpperCase()}`;
        const cfgEnv = document.getElementById('cfg-env');
        if (cfgEnv) cfgEnv.textContent = data.environment;
    } catch (err) {
        document.getElementById('health-json').textContent = 'Error connecting to API';
    }
}

// --- TEAMS & ROSTERS ---
async function loadTeams() {
    try {
        const res = await fetch('/api/teams/season/1');
        const json = await res.json();
        if (json.success) {
            allTeams = json.data;
            renderTeamList(allTeams);
            if (!currentTeamId && allTeams.length > 0) {
                selectTeam(allTeams[0].id);
            }
        }
    } catch (err) {
        console.error('Failed loading teams', err);
    }
}

function filterTeamsByAge() {
    const filter = document.getElementById('team-age-filter').value;
    const filtered = filter ? allTeams.filter(t => t.age_group === filter) : allTeams;
    renderTeamList(filtered);
}

function renderTeamList(teams) {
    const container = document.getElementById('team-list');
    container.innerHTML = '';
    if (teams.length === 0) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:1rem;">No teams match filter.</p>';
        return;
    }

    teams.forEach(team => {
        const item = document.createElement('div');
        item.className = `team-item ${team.id === currentTeamId ? 'active' : ''}`;
        item.onclick = () => selectTeam(team.id);
        item.innerHTML = `
            <div class="team-item-title">
                <strong>${team.name}</strong>
                <span class="badge badge-nfa">${team.age_group}</span>
            </div>
            <div class="team-item-meta">
                ${team.player_count || 0} players · ${team.coach_name ? 'Coach: ' + team.coach_name : 'No coach'}
            </div>
        `;
        container.appendChild(item);
    });
}

async function selectTeam(teamId) {
    currentTeamId = teamId;
    renderTeamList(allTeams);

    try {
        const res = await fetch(`/api/teams/${teamId}/roster`);
        const json = await res.json();
        if (!json.success) return;

        const { team, players, totalPlayers, compliance } = json.data;
        document.getElementById('selected-team-name').textContent = `${team.name} (Season ${team.season_year})`;
        document.getElementById('selected-team-meta').textContent = 
            `Age Group: ${team.age_group} | Squad Size: ${totalPlayers} / 16 | Coach: ${team.coach_name || 'TBA'} (${team.coach_phone || '—'}) | Manager: ${team.manager_name || 'TBA'} | Training: ${team.training_schedule || 'TBA'}`;

        const badgesEl = document.getElementById('team-compliance-badges');
        if (badgesEl && compliance) {
            badgesEl.innerHTML = `
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.4rem; flex-wrap: wrap;">
                    <small style="font-weight: 600; color: #4b5563;">WWCC / Blue Card Compliance:</small>
                    ${renderComplianceBadge(compliance.coach)}
                    ${renderComplianceBadge(compliance.manager)}
                </div>
            `;
        }

        const tbody = document.getElementById('roster-tbody');
        tbody.innerHTML = '';

        if (players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No players allocated to this squad yet. Click "+ Place Player on Roster" above.</td></tr>`;
            return;
        }

        players.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${idx + 1}</strong></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.dob}</td>
                <td><span class="badge ${p.isJunior ? 'badge-season' : 'badge-env'}">${p.isJunior ? 'Junior' : 'Senior'}</span></td>
                <td>${p.contactName}</td>
                <td><strong><a href="tel:${p.contactPhone}">${p.contactPhone}</a></strong></td>
                <td>${p.notes || '<span class="text-muted">—</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="openMovePlayerModal(${p.memberId}, '${p.name.replace(/'/g, "\\'")}', ${team.id})">Move</button>
                    <button class="btn btn-sm btn-danger" onclick="removePlayerFromTeam(${team.id}, ${p.memberId})">Remove</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function openAddPlayerToTeamModal() {
    if (!currentTeamId) {
        showAlert('Please select a team first', 'danger');
        return;
    }
    // Load registered members for 2026
    const res = await fetch('/api/registrations/season/1');
    const json = await res.json();
    const select = document.getElementById('place-player-select');
    select.innerHTML = '';

    if (json.data.length === 0) {
        select.innerHTML = '<option value="">No registered players found</option>';
    } else {
        json.data.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.member_id;
            opt.textContent = `${r.first_name} ${r.last_name} (${r.age_group} - DOB: ${r.member_dob})`;
            select.appendChild(opt);
        });
    }
    openModal('modal-place-player');
}

async function submitPlacePlayer(e) {
    e.preventDefault();
    const memberId = document.getElementById('place-player-select').value;
    try {
        const res = await fetch(`/api/teams/${currentTeamId}/roster`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('Player successfully added to team roster!');
            closeModal('modal-place-player');
            selectTeam(currentTeamId);
            loadTeams();
        } else {
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

function openMovePlayerModal(memberId, playerName, fromTeamId) {
    document.getElementById('move-member-id').value = memberId;
    document.getElementById('move-from-team-id').value = fromTeamId;
    document.getElementById('move-player-prompt').textContent = `Transfer player "${playerName}" to another squad:`;

    const select = document.getElementById('move-to-team-select');
    select.innerHTML = '';
    allTeams.filter(t => t.id !== fromTeamId).forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.age_group})`;
        select.appendChild(opt);
    });

    openModal('modal-move-player');
}

async function submitMovePlayer(e) {
    e.preventDefault();
    const memberId = document.getElementById('move-member-id').value;
    const fromTeamId = document.getElementById('move-from-team-id').value;
    const toTeamId = document.getElementById('move-to-team-select').value;

    try {
        const res = await fetch('/api/teams/move-player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, fromTeamId, toTeamId })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('Player successfully moved squads!');
            closeModal('modal-move-player');
            selectTeam(currentTeamId);
            loadTeams();
        } else {
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

async function removePlayerFromTeam(teamId, memberId) {
    if (!confirm('Remove player from this squad roster? (This does not delete their registration).')) return;
    try {
        const res = await fetch(`/api/teams/${teamId}/roster/${memberId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showAlert('Player removed from roster');
            selectTeam(teamId);
            loadTeams();
        } else {
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

function printRoster() {
    window.print();
}

// --- REGISTRATIONS ---
async function loadRegistrations() {
    try {
        const res = await fetch('/api/registrations/season/1');
        const json = await res.json();
        if (json.success) {
            allRegistrations = json.data;
            renderRegistrations(allRegistrations);
        }
    } catch (err) {
        console.error(err);
    }
}

function exportRegistrationsCSV() {
    showAlert('Exporting PlayRegister CSV for 2026 season...', 'success');
    window.location.href = '/api/registrations/export/csv?seasonId=1';
}

function filterRegistrations() {
    const q = document.getElementById('reg-search').value.toLowerCase();
    const filtered = allRegistrations.filter(r => 
        (r.first_name + ' ' + r.last_name).toLowerCase().includes(q)
    );
    renderRegistrations(filtered);
}

function renderRegistrations(regs) {
    const tbody = document.getElementById('reg-tbody');
    tbody.innerHTML = '';
    document.getElementById('reg-count-badge').textContent = `${regs.length} Registrations`;

    if (regs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No registrations found.</td></tr>`;
        return;
    }

    regs.forEach(r => {
        const tr = document.createElement('tr');
        const statusBadge = r.status === 'complete' ? 'badge-success' : (r.status === 'started' ? 'badge-warning' : 'badge-danger');
        tr.innerHTML = `
            <td>#${r.id}</td>
            <td><strong>${r.first_name} ${r.last_name}</strong></td>
            <td>${r.member_dob}</td>
            <td><span class="badge badge-nfa">${r.age_group}</span></td>
            <td><span class="badge ${statusBadge}">${r.status.toUpperCase()}</span></td>
            <td><span id="reg-guardians-${r.member_id}">Checking...</span></td>
            <td>${r.notes || '<span class="text-muted">—</span>'}</td>
            <td>${r.created_at.split(' ')[0]}</td>
            <td>
                ${r.status !== 'complete' ? `<button class="btn btn-sm btn-primary" onclick="completeRegistration(${r.id})">Complete</button>` : `<span class="badge badge-success">Verified</span>`}
            </td>
        `;
        tbody.appendChild(tr);

        // Check guardian count asynchronously
        fetch(`/api/guardians/member/${r.member_id}`)
            .then(res => res.json())
            .then(g => {
                const el = document.getElementById(`reg-guardians-${r.member_id}`);
                if (el) {
                    if (g.data.length > 0) {
                        el.innerHTML = `<span class="badge badge-success">${g.data.length} linked (${g.data[0].relationship})</span>`;
                    } else {
                        el.innerHTML = `<span class="badge badge-danger">0 linked (Missing)</span>`;
                    }
                }
            });
    });
}

async function completeRegistration(regId) {
    try {
        const res = await fetch(`/api/registrations/${regId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'complete' })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('Registration completed successfully!');
            loadRegistrations();
        } else {
            // Surfaces the Junior Guardian rule error clearly!
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

async function submitNewRegistration(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
        memberId: form.memberId.value,
        seasonId: 1,
        ageGroup: form.ageGroup.value,
        status: form.status.value,
        notes: form.notes.value
    };

    try {
        const res = await fetch('/api/registrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.success) {
            showAlert('Registration saved successfully!');
            closeModal('modal-new-registration');
            loadRegistrations();
        } else {
            // Highlighted refusal message!
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

// --- MEMBERS & GUARDIANS ---
async function loadMembers() {
    try {
        const res = await fetch('/api/members');
        const json = await res.json();
        if (json.success) {
            allMembers = json.data;
            renderMembers(allMembers);
            populateMemberDropdowns();
        }
    } catch (err) {
        console.error(err);
    }
}

function searchMembers() {
    const q = document.getElementById('member-search').value;
    fetch(`/api/members?search=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(json => {
            if (json.success) renderMembers(json.data);
        });
}

function renderMembers(members) {
    const tbody = document.getElementById('member-tbody');
    tbody.innerHTML = '';
    document.getElementById('member-count-badge').textContent = `${members.length} Members`;

    if (members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No members found.</td></tr>`;
        return;
    }

    members.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${m.id}</td>
            <td><strong>${m.first_name} ${m.last_name}</strong></td>
            <td>${m.dob}</td>
            <td>${m.gender || '—'}</td>
            <td id="m-guardian-name-${m.id}">Loading...</td>
            <td id="m-guardian-phone-${m.id}">Loading...</td>
            <td><span class="badge ${m.is_active ? 'badge-success' : 'badge-danger'}">${m.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewMemberHistory(${m.id})">History</button>
            </td>
        `;
        tbody.appendChild(tr);

        // Fetch guardian info
        fetch(`/api/guardians/member/${m.id}`)
            .then(res => res.json())
            .then(g => {
                const nameEl = document.getElementById(`m-guardian-name-${m.id}`);
                const phoneEl = document.getElementById(`m-guardian-phone-${m.id}`);
                if (nameEl && phoneEl) {
                    if (g.data.length > 0) {
                        const prim = g.data[0];
                        nameEl.textContent = `${prim.first_name} ${prim.last_name} (${prim.relationship})`;
                        phoneEl.innerHTML = `<a href="tel:${prim.mobile}">${prim.mobile}</a>`;
                    } else {
                        nameEl.innerHTML = `<span class="text-muted">None (Self / Missing)</span>`;
                        phoneEl.innerHTML = `<span class="text-muted">—</span>`;
                    }
                }
            });
    });
}

async function populateMemberDropdowns() {
    const regSelect = document.getElementById('reg-member-select');
    const linkMemberSelect = document.getElementById('link-member-select');
    if (regSelect) regSelect.innerHTML = '';
    if (linkMemberSelect) linkMemberSelect.innerHTML = '';

    allMembers.forEach(m => {
        const opt1 = document.createElement('option');
        opt1.value = m.id;
        opt1.textContent = `${m.first_name} ${m.last_name} (DOB: ${m.dob})`;
        if (regSelect) regSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = m.id;
        opt2.textContent = `${m.first_name} ${m.last_name} (DOB: ${m.dob})`;
        if (linkMemberSelect) linkMemberSelect.appendChild(opt2);
    });

    // Populate guardians list for linking
    const linkGuardianSelect = document.getElementById('link-guardian-select');
    if (linkGuardianSelect) {
        linkGuardianSelect.innerHTML = '';
        // Fetch guardian list
        for (let i = 1; i <= 15; i++) {
            fetch(`/api/guardians/${i}`)
                .then(res => res.json())
                .then(g => {
                    if (g.success) {
                        const opt = document.createElement('option');
                        opt.value = g.data.id;
                        opt.textContent = `${g.data.first_name} ${g.data.last_name} (${g.data.relationship}, ${g.data.mobile})`;
                        linkGuardianSelect.appendChild(opt);
                    }
                })
                .catch(() => {});
        }
    }
}

async function submitNewMember(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        dob: form.dob.value,
        gender: form.gender.value,
        email: form.email.value || null,
        phone: form.phone.value || null
    };

    try {
        const res = await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.success) {
            showAlert(`Member ${json.data.first_name} ${json.data.last_name} added!`);
            closeModal('modal-new-member');
            form.reset();
            loadMembers();
        } else {
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

async function submitNewGuardian(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        relationship: form.relationship.value,
        mobile: form.mobile.value,
        email: form.email.value || null,
        address: form.address.value || null
    };

    try {
        const res = await fetch('/api/guardians', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.success) {
            showAlert(`Guardian ${json.data.first_name} ${json.data.last_name} created!`);
            closeModal('modal-new-guardian');
            form.reset();
            populateMemberDropdowns();
        } else {
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

async function submitLinkGuardian(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
        memberId: form.memberId.value,
        guardianId: form.guardianId.value,
        isPrimary: form.isPrimary.value
    };

    try {
        const res = await fetch('/api/guardians/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.success) {
            showAlert('Junior successfully linked to shared parent/guardian!');
            closeModal('modal-link-guardian');
            loadMembers();
            loadRegistrations();
        } else {
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

function renderComplianceBadge(official) {
    if (!official) return '';
    let badgeClass = 'badge-success';
    if (official.status === 'EXPIRED' || official.status === 'MISSING') badgeClass = 'badge-danger';
    else if (official.status === 'EXPIRING_SOON' || official.status === 'PENDING_VERIFICATION') badgeClass = 'badge-warning';
    else if (official.status === 'EXEMPT') badgeClass = 'badge-env';

    const label = `${official.role}: ${official.name} [${official.status}]`;
    return `<span class="badge ${badgeClass}" title="${official.message || ''}">${label}</span>`;
}

async function submitNewTeam(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
        name: form.name.value,
        seasonId: 1,
        ageGroup: form.ageGroup.value,
        coachName: form.coachName.value || null,
        coachPhone: form.coachPhone.value || null,
        coachWwcc: form.coachWwcc ? form.coachWwcc.value || null : null,
        coachWwccExpiry: form.coachWwccExpiry ? form.coachWwccExpiry.value || null : null,
        managerName: form.managerName.value || null,
        managerPhone: form.managerPhone.value || null,
        managerWwcc: form.managerWwcc ? form.managerWwcc.value || null : null,
        managerWwccExpiry: form.managerWwccExpiry ? form.managerWwccExpiry.value || null : null,
        trainingSchedule: form.trainingSchedule.value || null
    };

    try {
        const res = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (json.success) {
            showAlert(`Team "${json.data.name}" created!`);
            closeModal('modal-new-team');
            form.reset();
            loadTeams();
        } else {
            showAlert(json.error, 'danger');
        }
    } catch (err) {
        showAlert(err.message, 'danger');
    }
}

function viewMemberHistory(memberId) {
    fetch(`/api/members/${memberId}`)
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                const m = json.data;
                let msg = `Member History: ${m.first_name} ${m.last_name}\nDOB: ${m.dob}\n\nRegistrations:\n`;
                if (m.registrations.length === 0) msg += 'No registrations recorded.';
                else m.registrations.forEach(r => msg += `• Season ${r.season_year}: ${r.age_group} (${r.status.toUpperCase()})\n`);
                alert(msg);
            }
        });
}

// Modal Helper
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}
