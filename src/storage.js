import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVUlvRP6kzeZd5Mq7dn8Ocx-r5OuTlZG4",
  authDomain: "promise-manager.firebaseapp.com",
  projectId: "promise-manager",
  storageBucket: "promise-manager.firebasestorage.app",
  messagingSenderId: "1033389781995",
  appId: "1:1033389781995:web:1e78e46e46c618c1649fae"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -----------------------------------------------------------------
// DATABASE CRUD OPERATIONS
// -----------------------------------------------------------------

export async function loadData(roomId) {
    if (!roomId) return null;
    try {
        const docRef = doc(db, 'rooms', roomId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (e) {
        console.error("Error loading data:", e);
        return null;
    }
}

export async function saveData(roomId, data) {
    try {
        const docRef = doc(db, 'rooms', roomId);
        await setDoc(docRef, data);
    } catch (e) {
        console.error("Save failed", e);
    }
}

export async function deleteRoom(roomId) {
    try {
        const docRef = doc(db, 'rooms', roomId);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Delete failed", e);
    }
}

// REAL-TIME LISTENER
export function listenToRoom(roomId, callback) {
    const docRef = doc(db, 'rooms', roomId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback(null);
        }
    });
}

// -----------------------------------------------------------------
// ROOM LOGIC
// -----------------------------------------------------------------

export async function initOrJoinRoom(roomId, role, password, username) {
    let data = await loadData(roomId);
    if (!data) {
        data = {
            roomId,
            deviPassword: role === 'devi' ? password : null,
            deviUsername: role === 'devi' ? username : null,
            duoPassword: role === 'duo' ? password : null,
            duoUsername: role === 'duo' ? username : null,
            promises: [],
            pendingRequests: []
        };
    } else {
        if (role === 'devi') {
            if (!data.deviPassword) {
                data.deviPassword = password;
                data.deviUsername = username;
            } else if (data.deviPassword === password) {
                data.deviUsername = username;
            }
        }
        if (role === 'duo') {
            if (!data.duoPassword) {
                data.duoPassword = password;
                data.duoUsername = username;
            } else if (data.duoPassword === password) {
                data.duoUsername = username;
            }
        }
        if (!data.pendingRequests) {
            data.pendingRequests = [];
        }
    }
    await saveData(roomId, data);
    return data;
}

export async function addPendingRequest(appData, requestData) {
    appData.pendingRequests.push({
        id: 'req_' + Date.now(),
        ...requestData
    });
    await saveData(appData.roomId, appData);
}

export async function removePendingRequest(appData, requestId) {
    appData.pendingRequests = appData.pendingRequests.filter(r => r.id !== requestId);
    await saveData(appData.roomId, appData);
}

export async function addPromise(data, promise) {
    promise.id = Date.now().toString();
    promise.createdAt = new Date().toISOString();
    promise.status = 'Chl Chl,Kar';
    data.promises.push(promise);
    await saveData(data.roomId, data);
}

export async function updatePromiseStatus(data, promiseId, status) {
    const p = data.promises.find(p => p.id === promiseId);
    if (p) {
        p.status = status;
        await saveData(data.roomId, data);
    }
}

export async function checkExpirations(data) {
    let changed = false;
    const now = new Date().getTime();
    data.promises.forEach(p => {
        if (p.status === 'Chl Chl,Kar' && p.timeLimit !== 'lifetime') {
            const createdTime = new Date(p.createdAt).getTime();
            let limitMs = 0;
            switch(p.timeLimit) {
                case 'days': limitMs = 7 * 24 * 60 * 60 * 1000; break;
                case 'weeks': limitMs = 4 * 7 * 24 * 60 * 60 * 1000; break;
                case 'month': limitMs = 365 * 24 * 60 * 60 * 1000 / 12; break;
                case 'year': limitMs = 5 * 365 * 24 * 60 * 60 * 1000; break;
            }
            if (now > createdTime + limitMs) {
                p.status = 'Broken';
                changed = true;
            }
        }
    });
    if (changed) {
        await saveData(data.roomId, data);
    }
}
