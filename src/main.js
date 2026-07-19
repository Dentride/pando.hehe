import gsap from 'gsap';
import QRCode from 'qrcode';
import { loadData, initOrJoinRoom, addPromise, updatePromiseStatus, checkExpirations, addPendingRequest, removePendingRequest } from './storage.js';
import { initScene } from './scene.js';

let appData = null;
let selectedRole = null;
let currentPromiseId = null;
let savedRoomId = localStorage.getItem('last_room');
let savedRole = localStorage.getItem('last_role');

// DOM Elements
const authView = document.getElementById('auth-view');
const dashView = document.getElementById('dashboard-view');
const roleSelection = document.getElementById('role-selection');
const authInputs = document.getElementById('auth-inputs');
const inputRoomId = document.getElementById('room-id');
const inputPass = document.getElementById('auth-pass');
const labelRole = document.getElementById('auth-role-label');
const promisesList = document.getElementById('promises-list');

// QR Modal
const modalQr = document.getElementById('modal-qr');

// Init
async function init() {
    initScene();
    gsap.from('.auth-card', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.5 });
    
    // Reveal animation for the About section text
    gsap.from('.about-content', {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
            trigger: '.section-about',
            start: 'top 70%', // Triggers when the top of the section is 70% down the viewport
        }
    });

    document.getElementById('btn-start').addEventListener('click', () => {
        document.getElementById('app').scrollIntoView({ behavior: 'smooth' });
    });

    // Check URL params for QR code invite
    const params = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room');
    const inviteRole = params.get('role');

    if (inviteRoom && inviteRole) {
        selectRole(inviteRole);
        inputRoomId.value = inviteRoom;
        inputRoomId.disabled = true;
        return;
    }

    // Auto-login if previously logged in
    if (savedRoomId && savedRole) {
        const data = await loadData(savedRoomId);
        if (data) {
            appData = data;
            enterDashboard();
        }
    }
}

// Auth Flow
document.getElementById('btn-role-devi').addEventListener('click', () => selectRole('devi'));
document.getElementById('btn-role-duo').addEventListener('click', () => selectRole('duo'));
document.getElementById('btn-back-role').addEventListener('click', () => {
    authInputs.style.display = 'none';
    roleSelection.style.display = 'flex';
});

function selectRole(role) {
    selectedRole = role;
    labelRole.textContent = role === 'devi' ? "You are Devi" : "You are Devi's Duo";
    roleSelection.style.display = 'none';
    authInputs.style.display = 'block';
    gsap.from(authInputs, { opacity: 0, y: 10, duration: 0.3 });
}

document.getElementById('btn-enter-room').addEventListener('click', async () => {
    const roomId = inputRoomId.value.trim();
    const pass = inputPass.value;
    const username = document.getElementById('auth-username').value.trim();

    if (!roomId || !pass || !username) {
        alert("Please enter Connection Code, Username, and Password.");
        return;
    }

    appData = await initOrJoinRoom(roomId, selectedRole, pass, username);
    localStorage.setItem('last_room', roomId);
    localStorage.setItem('last_role', selectedRole);
    savedRole = selectedRole; 
    
    enterDashboard();

    // Spontaneously show QR code if the other user hasn't joined yet
    if (!appData.deviPassword || !appData.duoPassword) {
        setTimeout(showQrModal, 800);
    }
});

async function enterDashboard() {
    await checkExpirations(appData);
    
    gsap.to(authView, { opacity: 0, y: -20, duration: 0.5, onComplete: () => {
        authView.classList.remove('active');
        dashView.classList.add('active');
        
        const deviName = appData.deviUsername || "Waiting...";
        const duoName = appData.duoUsername || "Waiting...";
        document.getElementById('current-room').textContent = `Devi: ${deviName} | Duo: ${duoName}`;
        
        renderDashboard();
        checkIncomingRequests();
        
        gsap.from('.clay-header', { opacity: 0, y: -20, duration: 0.5 });
        gsap.from('.stats-panel', { opacity: 0, scale: 0.9, duration: 0.5, delay: 0.2 });
    }});
}

// Refresh dashboard every 5 seconds
setInterval(async () => {
    if (dashView.classList.contains('active') && appData) {
        const newData = await loadData(appData.roomId);
        if (newData && JSON.stringify(newData) !== JSON.stringify(appData)) {
            appData = newData;
            
            const deviName = appData.deviUsername || "Waiting...";
            const duoName = appData.duoUsername || "Waiting...";
            document.getElementById('current-room').textContent = `Devi: ${deviName} | Duo: ${duoName}`;
            
            renderDashboard();
            checkIncomingRequests();
        }
    }
}, 5000);

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('last_room');
    localStorage.removeItem('last_role');
    window.location.reload();
});

const modalIncoming = document.getElementById('modal-incoming-auth');
let currentIncomingReq = null;

function checkIncomingRequests() {
    if (!appData.pendingRequests || appData.pendingRequests.length === 0) return;
    
    // Find first request not made by me
    const req = appData.pendingRequests.find(r => r.requesterRole !== savedRole);
    if (req && !modalIncoming.classList.contains('active')) {
        currentIncomingReq = req;
        const msg = req.type === 'CREATE_PROMISE' 
            ? `Your partner wants to make a new promise: "${req.payload.title}".` 
            : `Your partner wants to update a promise to: "${req.payload.status}".`;
            
        document.getElementById('incoming-auth-msg').textContent = msg;
        
        modalIncoming.classList.add('active');
        gsap.fromTo(modalIncoming.querySelector('.modal'), 
            { scale: 0.9, opacity: 0 }, 
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );
    }
}

document.getElementById('btn-decline-incoming').addEventListener('click', async () => {
    if (!currentIncomingReq) return;
    await removePendingRequest(appData, currentIncomingReq.id);
    closeIncomingModal();
});

document.getElementById('btn-approve-incoming').addEventListener('click', async () => {
    if (!currentIncomingReq) return;
    
    const myPass = document.getElementById('auth-incoming-pass').value;
    const correctPass = savedRole === 'devi' ? appData.deviPassword : appData.duoPassword;
    
    if (myPass !== correctPass) {
        return alert("Incorrect password!");
    }
    
    // Execute request
    if (currentIncomingReq.type === 'CREATE_PROMISE') {
        await addPromise(appData, currentIncomingReq.payload);
    } else if (currentIncomingReq.type === 'UPDATE_STATUS') {
        await updatePromiseStatus(appData, currentIncomingReq.payload.promiseId, currentIncomingReq.payload.status);
    }
    
    await removePendingRequest(appData, currentIncomingReq.id);
    closeIncomingModal();
    renderDashboard();
});

function closeIncomingModal() {
    gsap.to(modalIncoming.querySelector('.modal'), { scale: 0.9, opacity: 0, duration: 0.2, onComplete: () => {
        modalIncoming.classList.remove('active');
        document.getElementById('auth-incoming-pass').value = '';
        currentIncomingReq = null;
    }});
}

// QR Logic
async function showQrModal() {
    const roleToInvite = savedRole === 'devi' ? 'duo' : 'devi';
    const link = `http://${window.location.hostname}:5173/?room=${appData.roomId}&role=${roleToInvite}`;
    
    
    const container = document.getElementById('qr-code-container');
    container.innerHTML = 'Generating...';
    
    modalQr.classList.add('active');
    gsap.fromTo(modalQr.querySelector('.modal'), 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
    );

    try {
        const dataUrl = await QRCode.toDataURL(link, { 
            width: 220, 
            margin: 2, 
            color: { dark: '#000000', light: '#ffffff' } 
        });
        container.innerHTML = `<img src="${dataUrl}" alt="QR Code" style="border-radius: 8px;">`;
    } catch (err) {
        console.error("QR Code Error:", err);
        container.innerHTML = `<a href="${link}" style="color:var(--text-main); font-size:0.8rem; word-break:break-all;">${link}</a>`;
    }
}

document.getElementById('btn-show-qr').addEventListener('click', showQrModal);

document.getElementById('btn-close-qr').addEventListener('click', () => {
    gsap.to(modalQr.querySelector('.modal'), { scale: 0.9, opacity: 0, duration: 0.2, onComplete: () => {
        modalQr.classList.remove('active');
    }});
});

// Dashboard Rendering
function renderDashboard() {
    let pending = 0, kept = 0, broken = 0;
    promisesList.innerHTML = '';

    appData.promises.forEach((p, index) => {
        if (p.status === 'Chl Chl,Kar') pending++;
        else if (p.status === 'Delulu') kept++;
        else if (p.status === 'Broken') broken++;

        const card = document.createElement('div');
        card.className = 'promise-card';
        card.dataset.status = p.status;
        
        const createdDate = new Date(p.createdAt).toLocaleDateString();
        
        card.innerHTML = `
            <h3>${p.title}</h3>
            <div class="meta">
                <span>Limit: ${p.timeLimit}</span>
                <span>${createdDate}</span>
            </div>
            <div class="status-badge">${p.status}</div>
        `;

        card.addEventListener('click', () => openActionModal(p));
        promisesList.appendChild(card);
    });

    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-kept').textContent = kept;
    document.getElementById('stat-broken').textContent = broken;
}

// New Promise Modal
const modalNew = document.getElementById('modal-new-promise');
document.getElementById('btn-new-promise').addEventListener('click', () => {
    modalNew.classList.add('active');
    gsap.fromTo(modalNew.querySelector('.modal'), 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
    );
});

document.getElementById('btn-cancel-new').addEventListener('click', () => {
    gsap.to(modalNew.querySelector('.modal'), { scale: 0.9, opacity: 0, duration: 0.2, onComplete: () => {
        modalNew.classList.remove('active');
        clearInputs(modalNew);
    }});
});

document.getElementById('btn-confirm-new').addEventListener('click', async () => {
    const title = document.getElementById('promise-title').value;
    const timeLimit = document.getElementById('promise-time').value;
    const myPass = document.getElementById('auth-my-new').value;

    if (!title) return alert("Title is required!");
    
    const correctPass = savedRole === 'devi' ? appData.deviPassword : appData.duoPassword;
    if (myPass !== correctPass) {
        return alert("Incorrect password! Enter your own secret password.");
    }

    await addPendingRequest(appData, {
        type: 'CREATE_PROMISE',
        requesterRole: savedRole,
        payload: { title, timeLimit }
    });
    
    alert("Request sent to your partner for approval!");
    
    gsap.to(modalNew.querySelector('.modal'), { scale: 0.9, opacity: 0, duration: 0.2, onComplete: () => {
        modalNew.classList.remove('active');
        clearInputs(modalNew);
    }});
});

// Action Modal
const modalAction = document.getElementById('modal-action-promise');
function openActionModal(promise) {
    if (promise.status !== 'Chl Chl,Kar') {
        alert("This promise has already been concluded as " + promise.status);
        return;
    }
    currentPromiseId = promise.id;
    document.getElementById('action-promise-title').textContent = `Promise: ${promise.title}`;
    
    modalAction.classList.add('active');
    gsap.fromTo(modalAction.querySelector('.modal'), 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
    );
}

document.getElementById('btn-cancel-action').addEventListener('click', () => {
    gsap.to(modalAction.querySelector('.modal'), { scale: 0.9, opacity: 0, duration: 0.2, onComplete: () => {
        modalAction.classList.remove('active');
        clearInputs(modalAction);
    }});
});

document.getElementById('btn-confirm-action').addEventListener('click', async () => {
    const status = document.getElementById('promise-action').value;
    const myPass = document.getElementById('auth-my-action').value;

    const correctPass = savedRole === 'devi' ? appData.deviPassword : appData.duoPassword;
    if (myPass !== correctPass) {
        return alert("Incorrect password! Enter your own secret password.");
    }

    await addPendingRequest(appData, {
        type: 'UPDATE_STATUS',
        requesterRole: savedRole,
        payload: { promiseId: currentPromiseId, status }
    });
    
    alert("Request sent to your partner for approval!");
    
    gsap.to(modalAction.querySelector('.modal'), { scale: 0.9, opacity: 0, duration: 0.2, onComplete: () => {
        modalAction.classList.remove('active');
        clearInputs(modalAction);
    }});
});

function clearInputs(parent) {
    parent.querySelectorAll('input').forEach(input => input.value = '');
}

// Start
init();
