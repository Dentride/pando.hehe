const API_URL = `http://${window.location.hostname}:3000/room`;

export async function loadData(roomId) {
    if (!roomId) return null;
    try {
        const res = await fetch(`${API_URL}/${roomId}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

export async function saveData(roomId, data) {
    try {
        await fetch(`${API_URL}/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error("Save failed", e);
    }
}

export async function deleteRoom(roomId) {
    try {
        await fetch(`${API_URL}/${roomId}`, {
            method: 'DELETE'
        });
    } catch (e) {
        console.error("Delete failed", e);
    }
}

export async function initOrJoinRoom(roomId, role, password, username) {
    let data = await loadData(roomId);
    if (!data) {
        // Create new room
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
        // Join existing room
        if (role === 'devi') {
            if (!data.deviPassword) {
                data.deviPassword = password;
                data.deviUsername = username;
            } else if (data.deviPassword === password) {
                data.deviUsername = username; // Update username on subsequent logins
            }
        }
        if (role === 'duo') {
            if (!data.duoPassword) {
                data.duoPassword = password;
                data.duoUsername = username;
            } else if (data.duoPassword === password) {
                data.duoUsername = username; // Update username on subsequent logins
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
