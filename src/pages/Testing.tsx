import { Button, Flex, Input, Badge, Tooltip } from "antd";
import { useState } from "react";
import FormbarHeader from "../components/FormbarHeader";
import { useSettings, getAppearAnimation } from "../main";
import Log from "../debugLogger";

// Import API functions
import * as userApi from "../api/userApi";
import * as classApi from "../api/classApi";
import * as digipogApi from "../api/digipogApi";
import * as managerApi from "../api/managerApi";
import * as notificationApi from "../api/notificationApi";
import { getPublicKey } from "../api/systemApi";

const testFuncs = [
    { name: 'Clear Console', func: () => console.clear(), hasArgs: false, category: 'System', method: 'DELETE', testedWorks: true },
    { name: 'Certs', func: certs, hasArgs: false, category: 'System', method: 'GET', testedWorks: true },

    { name: 'Get Me', func: getMe, hasArgs: false, category: 'User', method: 'GET', testedWorks: true },
    { name: 'Get My Scopes', func: getMyScopes, hasArgs: true, category: 'User', method: 'GET', testedWorks: true },
    { name: 'Get User', func: getUser, hasArgs: true, category: 'User', method: 'GET', testedWorks: true },
    { name: 'Get User Class', func: getUserClass, hasArgs: true, category: 'User', method: 'GET' },
    { name: 'Get User Classes', func: getUserClasses, hasArgs: true, category: 'User', method: 'GET', testedWorks: true },
    { name: 'Delete User', func: deleteUser, hasArgs: true, category: 'User', method: 'DELETE', testedWorks: true },
    { name: 'Change Perm (email|perm)', func: changePerm, hasArgs: true, category: 'User', method: 'PATCH', testedWorks: true },
    { name: 'Ban User', func: banUser, hasArgs: true, category: 'User', method: 'PATCH', testedWorks: true },
    { name: 'Unban User', func: unbanUser, hasArgs: true, category: 'User', method: 'PATCH', testedWorks: true },
    { name: 'Verify User', func: verifyUser, hasArgs: true, category: 'User', method: 'PATCH' },
    { name: 'Regenerate API Key', func: regenerateApiKey, hasArgs: true, category: 'User', method: 'PATCH' },
    { name: 'Update PIN', func: updatePin, hasArgs: true, category: 'User', method: 'PATCH' },
    { name: 'Request PIN Reset', func: requestPinReset, hasArgs: true, category: 'User', method: 'POST' },
    { name: 'Reset PIN (Token)', func: resetPinWithToken, hasArgs: true, category: 'User', method: 'PATCH' },

    // Class endpoints (from attachments)
    { name: 'Get Class', func: getClass, hasArgs: true, category: 'Class', method: 'GET', testedWorks: 'Only if class started' },
    { name: 'Get Class Active', func: getClassActive, hasArgs: true, category: 'Class', method: 'GET' },
    { name: 'Get Class Banned', func: getClassBanned, hasArgs: true, category: 'Class', method: 'GET' },
    { name: 'Get Class Links', func: getClassLinks, hasArgs: true, category: 'Class', method: 'GET' },
    { name: 'Get Class Permissions', func: getClassPermissions, hasArgs: true, category: 'Class', method: 'GET' },
    { name: 'Get Class Students', func: getClassStudents, hasArgs: true, category: 'Class', method: 'GET' },
    { name: 'Create Class', func: createClass, hasArgs: true, category: 'Class', method: 'POST', testedWorks: true },
    { name: 'End Class', func: endClass, hasArgs: true, category: 'Class', method: 'POST', testedWorks: true },
    { name: 'Join Class', func: joinClass, hasArgs: true, category: 'Class', method: 'POST', testedWorks: true },
    { name: 'Leave Class', func: leaveClass, hasArgs: true, category: 'Class', method: 'POST', testedWorks: true },
    { name: 'Start Class', func: startClass, hasArgs: true, category: 'Class', method: 'POST', testedWorks: true },

    // Class - Polls
    { name: 'Get Class Polls', func: getClassPolls, hasArgs: true, category: 'Class - Polls', method: 'GET' },
    { name: 'Get Class Current Poll', func: getClassPollCurrent, hasArgs: true, category: 'Class - Polls', method: 'GET', testedWorks: true },
    { name: 'Clear Class Poll', func: clearClassPolls, hasArgs: true, category: 'Class - Polls', method: 'POST', testedWorks: true },
    { name: 'Create Class Poll', func: createClassPoll, hasArgs: true, category: 'Class - Polls', method: 'POST' },
    { name: 'End Class Poll', func: endClassPoll, hasArgs: true, category: 'Class - Polls', method: 'POST', testedWorks: true },
    { name: 'Response to Poll', func: respondClassPoll, hasArgs: true, category: 'Class - Polls', method: 'POST' },

    // Class - Breaks
    { name: 'End Own Break', func: endOwnBreak, hasArgs: true, category: 'Class - Breaks', method: 'POST' },
    { name: 'Request Break', func: requestBreak, hasArgs: true, category: 'Class - Breaks', method: 'POST', testedWorks: true },
    { name: 'Approve Break', func: approveBreak, hasArgs: true, category: 'Class - Breaks', method: 'POST', testedWorks: true },
    { name: 'Deny Break', func: denyBreak, hasArgs: true, category: 'Class - Breaks', method: 'POST' },

    // Class - Help
    { name: 'Delete Help Request', func: deleteHelpRequest, hasArgs: true, category: 'Class - Help', method: 'DELETE', testedWorks: true },
    { name: 'Request Help', func: requestClassHelp, hasArgs: true, category: 'Class - Help', method: 'POST' },

    // Class - Tags & Enrollment
    { name: 'Leave Class', func: leaveClass, hasArgs: true, category: 'Class', method: 'DELETE', testedWorks: true },
    { name: 'Get Class Tags', func: getClassTags, hasArgs: false, category: 'Class - Tags', method: 'GET' },
    { name: 'Join Class By Code', func: joinClassByCode, hasArgs: true, category: 'Class', method: 'POST' },
    { name: 'Set Class Tags', func: setClassTags, hasArgs: true, category: 'Class - Tags', method: 'PUT' },

    // Class - Links
    { name: 'Remove Class Link', func: removeClassLink, hasArgs: true, category: 'Class - Links', method: 'DELETE' },
    { name: 'Get Class Links', func: getClassLinks, hasArgs: true, category: 'Class - Links', method: 'GET' },
    { name: 'Add Class Link', func: addClassLink, hasArgs: true, category: 'Class - Links', method: 'POST' },
    { name: 'Update Class Link', func: updateClassLink, hasArgs: true, category: 'Class - Links', method: 'PUT' },

    // Digipogs
    { name: 'Award Digipogs', func: awardDigipogs, hasArgs: true, category: 'Digipogs', method: 'POST' },
    { name: 'Transfer Digipogs', func: transferDigipogs, hasArgs: true, category: 'Digipogs', method: 'POST' },

    // IP Management
    { name: 'Remove IP', func: removeIP, hasArgs: true, category: 'IP', method: 'DELETE' },
    { name: 'Get IP List', func: getIPList, hasArgs: true, category: 'IP', method: 'GET', testedWorks: true },
    { name: 'Toggle IP', func: toggleIP, hasArgs: true, category: 'IP', method: 'POST' },
    { name: 'Update IP', func: updateIP, hasArgs: true, category: 'IP', method: 'PUT' },

    // Manager
    { name: 'Get Manager', func: getManager, hasArgs: false, category: 'Manager', method: 'GET', testedWorks: true },

    // Logs
    { name: 'Get Logs', func: getLogs, hasArgs: false, category: 'Logs', method: 'GET' },
    { name: 'Get Log File', func: getLogFile, hasArgs: true, category: 'Logs', method: 'GET' },

    // OAuth
    { name: 'OAuth Authorize', func: oauthAuthorize, hasArgs: false, category: 'OAuth', method: 'GET' },
    { name: 'OAuth Revoke', func: oauthRevoke, hasArgs: true, category: 'OAuth', method: 'POST' },
    { name: 'OAuth Token', func: oauthToken, hasArgs: true, category: 'OAuth', method: 'POST' },

    // User
    { name: 'Get User Transactions', func: getUserTransactions, hasArgs: true, category: 'User', method: 'GET' },

    // Pools
    { name: 'Get User Pools', func: getUserPools, hasArgs: false, category: 'Pools', method: 'GET' },

    // Notifications
    { name: 'Get Notifications', func: getNotifications, hasArgs: false, category: 'Notifications', method: 'GET', testedWorks: true },
    { name: 'Get Notification by ID', func: getNotifByID, hasArgs: true, category: 'Notifications', method: 'GET', testedWorks: true },
    { name: 'Mark Notification as Read', func: markNotifAsRead, hasArgs: true, category: 'Notifications', method: 'POST', testedWorks: true },
    { name: 'Delete Notifications', func: deleteAllNotif, hasArgs: false, category: 'Notifications', method: 'DELETE', testedWorks: true },
    { name: 'Delete Notification by ID', func: deleteNotifByID, hasArgs: true, category: 'Notifications', method: 'DELETE', testedWorks: true },
]

function getButtonStyle(method?: string) {
    const map: Record<string, string> = {
        GET: 'blue',      // blue
        DELETE: 'red',   // red
        POST: 'green',     // green
        PATCH: 'cyan',    // teal
        PUT: 'orange',      // orange
    };
    const color = method ? map[method.toUpperCase()] || 'default' : 'default';
    return color;
}

export function Testing() {
    const [inputValue, setInputValue] = useState("");
    const [bodyValue, setBodyValue] = useState("");
    const { settings } = useSettings();

    return (
        <div style={{ padding: '0 20px' }}>
            <FormbarHeader />
            <Flex style={{ height: 'calc(100vh - 60px)', overflow: 'auto' }} wrap gap={16} align="start">
                <Flex justify="center" align="center" gap={20} style={{marginTop:16}}>
                    <h1>Testing Page</h1>
                    <p>This page is for testing new features and components.</p>
                    <p>Working: {testFuncs.filter(t => t.testedWorks === true).length-1}/{testFuncs.length-1}</p>
                </Flex>
                <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Argument (id, email, or 'email|perm')"/>
                <Input value={bodyValue} onChange={(e) => setBodyValue(e.target.value)} placeholder="Body (for POST/PUT requests)"/>
                {
                    // group tests by category
                    Object.entries(testFuncs.reduce<Record<string, any[]>>((acc, t) => {
                        const key = (t as any).category || 'Uncategorized';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(t);
                        return acc;
                    }, {})).map(([category, tests], index) => (
                        <div key={category} style={{ marginBottom: 12, 
                                                    ...getAppearAnimation(settings.accessibility.disableAnimations, index) }}>
                            <h3 style={{ margin: '6px 0' }}>{category}</h3>
                            <Flex vertical align="start" style={{ background: '#000a', padding: 8, borderRadius: 10 }} wrap gap={8}>
                                {tests.map((test: any, index: number) => (
                                    <Tooltip title={typeof test.testedWorks === 'string' ? test.testedWorks : test.testedWorks === true ? 'Works' : "Not working"} color={test.testedWorks === true ? 'green' : !test.testedWorks ? 'red' : 'orange'} mouseEnterDelay={0.5}>
                                        <Badge dot color={test.testedWorks === true ? 'green' : !test.testedWorks ? 'red' : 'orange'}>
                                            <Button
                                                key={test.name}
                                                onClick={() => test.hasArgs ? test.func(inputValue, bodyValue) : test.func()}
                                                style={{ margin: 4,
                                                    ...getAppearAnimation(settings.accessibility.disableAnimations, index)
                                                 }}
                                                type='default'
                                                variant="solid"
                                                color={getButtonStyle(test.method) as any}
                                            >{test.name}</Button>
                                        </Badge>
                                    </Tooltip>
                                ))}
                            </Flex>
                        </div>
                    ))
                }
            </Flex>
        </div>
    );
}

async function certs() {
    try {
        const data = await getPublicKey();
        Log({ message: "Certs:", data });
    } catch (err) {
        Log({ message: "Error fetching certs:", data: err, level: "error" });
    }
}

async function getMe() {
    try {
        const data = await userApi.getMe();
        Log({ message: "Get Me:", data });
    } catch (err) {
        Log({ message: "Error getting /me:", data: err, level: "error" });
    }
}

async function getMyScopes(id: string) {
    if (!id) return Log({ message: "getMyScopes requires an id", level: "warn" });
    try {
        const data = await userApi.getUserScopes(id);
        Log({ message: "Get Scopes:", data });
    } catch (err) {
        Log({ message: "Error getting scopes:", data: err, level: "error" });
    }
}

async function getUser(inputValue: string) {
    if (!inputValue) return Log({ message: "getUser requires an id", level: "warn" });
    try {
        const data = await userApi.getUser(inputValue);
        Log({ message: "Get User:", data });
    } catch (err) {
        Log({ message: "Error getting user:", data: err, level: "error" });
    }
}

async function getUserClass(inputValue: string) {
    if (!inputValue) return Log({ message: "getUserClass requires an id", level: "warn" });
    try {
        const data = await userApi.getUserActiveClass(inputValue);
        Log({ message: "Get User Class:", data });
    } catch (err) {
        Log({ message: "Error getting user class:", data: err, level: "error" });
    }
}

async function getUserClasses(inputValue: string) {
    if (!inputValue) return Log({ message: "getUserClasses requires an id", level: "warn" });
    try {
        const data = await userApi.getUserClasses(inputValue);
        Log({ message: "Get User Classes:", data });
    } catch (err) {
        Log({ message: "Error getting user classes:", data: err, level: "error" });
    }
}

async function deleteUser(inputValue: string) {
    if (!inputValue) return Log({ message: "deleteUser requires an id", level: "warn" });
    try {
        const data = await userApi.deleteUser(inputValue);
        Log({ message: "Delete User:", data });
    } catch (err) {
        Log({ message: "Error deleting user:", data: err, level: "error" });
    }
}

async function changePerm(inputValue: string) {
    if (!inputValue) return Log({ message: "changePerm requires input like 'email|perm'", level: "warn" });
    let email = inputValue;
    let payload: any = {};
    if (inputValue.includes('|')) {
        const [e, p] = inputValue.split('|');
        email = e.trim();
        payload = { perm: p.trim() };
    } else {
        try { payload = JSON.parse(inputValue); }
        catch { payload = { perm: inputValue }; }
    }

    try {
        const data = await userApi.updateUserPermissions(email, payload);
        Log({ message: "Change Perm:", data });
    } catch (err) {
        Log({ message: "Error changing perm:", data: err, level: "error" });
    }
}

async function banUser(inputValue: string) {
    if (!inputValue) return Log({ message: "banUser requires an id", level: "warn" });
    try {
        const data = await userApi.banUser(inputValue);
        Log({ message: "Ban User:", data });
    } catch (err) {
        Log({ message: "Error banning user:", data: err, level: "error" });
    }
}

async function unbanUser(inputValue: string) {
    if (!inputValue) return Log({ message: "unbanUser requires an id", level: "warn" });
    try {
        const data = await userApi.unbanUser(inputValue);
        Log({ message: "Unban User:", data });
    } catch (err) {
        Log({ message: "Error unbanning user:", data: err, level: "error" });
    }
}

async function verifyUser(inputValue: string) {
    if (!inputValue) return Log({ message: "verifyUser requires an id", level: "warn" });
    try {
        const data = await userApi.verifyUser(inputValue);
        Log({ message: "Verify User:", data });
    } catch (err) {
        Log({ message: "Error verifying user:", data: err, level: "error" });
    }
}

async function regenerateApiKey(inputValue: string) {
    if (!inputValue) return Log({ message: "regenerateApiKey requires an id", level: "warn" });
    try {
        const data = await userApi.regenerateUserApiKey(inputValue);
        Log({ message: "Regenerate API Key:", data });
    } catch (err) {
        Log({ message: "Error regenerating API key:", data: err, level: "error" });
    }
}

async function updatePin(inputValue: string) {
    if (!inputValue) return Log({ message: "updatePin requires 'id|newPin|oldPin(optional)'", level: "warn" });
    let id = "";
    let payload: any = {};
    if (inputValue.includes('|')) {
        const [userId, newPin, oldPin] = inputValue.split('|').map(s => s.trim());
        id = userId;
        payload = { pin: newPin, ...(oldPin ? { oldPin } : {}) };
    } else {
        try {
            const parsed = JSON.parse(inputValue);
            id = String(parsed.id || "");
            payload = { pin: parsed.pin, ...(parsed.oldPin ? { oldPin: parsed.oldPin } : {}) };
        } catch {
            return Log({ message: "updatePin requires 'id|newPin|oldPin(optional)' or JSON", level: "warn" });
        }
    }
    if (!id || !payload.pin) return Log({ message: "updatePin requires both id and pin", level: "warn" });

    try {
        const data = await userApi.updateUserPin(id, payload);
        Log({ message: "Update PIN:", data });
    } catch (err) {
        Log({ message: "Error updating PIN:", data: err, level: "error" });
    }
}

async function requestPinReset(inputValue: string) {
    if (!inputValue) return Log({ message: "requestPinReset requires a user id", level: "warn" });
    try {
        const data = await userApi.requestUserPinReset(inputValue);
        Log({ message: "Request PIN Reset:", data });
    } catch (err) {
        Log({ message: "Error requesting PIN reset:", data: err, level: "error" });
    }
}

async function resetPinWithToken(inputValue: string) {
    if (!inputValue) return Log({ message: "resetPinWithToken requires JSON body", level: "warn" });
    let payload: any;
    try {
        payload = JSON.parse(inputValue);
    } catch {
        return Log({ message: "resetPinWithToken requires JSON body like {\"pin\":\"1234\",\"token\":\"...\"}",  level: "warn" });
    }

    try {
        const data = await userApi.resetPinWithToken(payload.pin, payload.token);
        Log({ message: "Reset PIN (Token):", data });
    } catch (err) {
        Log({ message: "Error resetting PIN:", data: err, level: "error" });
    }
}

// --- Class endpoints ---
async function getClass(inputValue: string) {
    if (!inputValue) return Log({ message: "getClass requires an id", level: "warn" });
    try {
        const data = await classApi.getClass(Number(inputValue));
        Log({ message: "Get Class:", data });
    } catch (err) {
        Log({ message: "Error getting class:", data: err, level: "error" });
    }
}

async function getClassActive(inputValue: string) {
    if (!inputValue) return Log({ message: "getClassActive requires an id", level: "warn" });
    try {
        const data = await classApi.checkActiveClass(Number(inputValue));
        Log({ message: "Get Class Active:", data });
    } catch (err) {
        Log({ message: "Error getting class active:", data: err, level: "error" });
    }
}

async function getClassBanned(inputValue: string) {
    if (!inputValue) return Log({ message: "getClassBanned requires an id", level: "warn" });
    try {
        const data = await classApi.getBannedClassStudents(Number(inputValue));
        Log({ message: "Get Class Banned:", data });
    } catch (err) {
        Log({ message: "Error getting class banned:", data: err, level: "error" });
    }
}

async function getClassLinks(inputValue: string) {
    if (!inputValue) return Log({ message: "getClassLinks requires an id", level: "warn" });
    try {
        const data = await classApi.getClassLinks(Number(inputValue));
        Log({ message: "Get Class Links:", data });
    } catch (err) {
        Log({ message: "Error getting class links:", data: err, level: "error" });
    }
}

async function getClassPermissions(inputValue: string) {
    if (!inputValue) return Log({ message: "getClassPermissions requires an id", level: "warn" });
    try {
        const data = await classApi.getClassPermissions(Number(inputValue));
        Log({ message: "Get Class Permissions:", data });
    } catch (err) {
        Log({ message: "Error getting class permissions:", data: err, level: "error" });
    }
}

async function getClassStudents(inputValue: string) {
    if (!inputValue) return Log({ message: "getClassStudents requires an id", level: "warn" });
    try {
        const data = await classApi.getClassStudents(Number(inputValue));
        Log({ message: "Get Class Students:", data });
    } catch (err) {
        Log({ message: "Error getting class students:", data: err, level: "error" });
    }
}

async function createClass(inputValue: string) {
    if (!inputValue) return Log({ message: "createClass requires a body (JSON or class name)", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(inputValue); } catch { payload = { name: inputValue }; }
    try {
        const data = await classApi.createClass(payload);
        Log({ message: "Create Class:", data });
    } catch (err) {
        Log({ message: "Error creating class:", data: err, level: "error" });
    }
}

async function endClass(inputValue: string) {
    if (!inputValue) return Log({ message: "endClass requires an id", level: "warn" });
    try {
        const data = await classApi.endClassSession(Number(inputValue));
        Log({ message: "End Class:", data });
    } catch (err) {
        Log({ message: "Error ending class:", data: err, level: "error" });
    }
}

async function joinClass(inputValue: string) {
    if (!inputValue) return Log({ message: "joinClass requires an id", level: "warn" });
    try {
        const data = await classApi.joinClassSession(Number(inputValue));
        Log({ message: "Join Class:", data });
    } catch (err) {
        Log({ message: "Error joining class:", data: err, level: "error" });
    }
}

async function leaveClass(inputValue: string) {
    if (!inputValue) return Log({ message: "leaveClass requires an id", level: "warn" });
    try {
        const data = await classApi.leaveClassSession(Number(inputValue));
        Log({ message: "Leave Class:", data });
    } catch (err) {
        Log({ message: "Error leaving class:", data: err, level: "error" });
    }
}

async function startClass(inputValue: string) {
    if (!inputValue) return Log({ message: "startClass requires an id", level: "warn" });
    try {
        const data = await classApi.startClassSession(Number(inputValue));
        Log({ message: "Start Class:", data });
    } catch (err) {
        Log({ message: "Error starting class:", data: err, level: "error" });
    }
}

// --- Class - Polls ---
async function getClassPolls(inputValue: string) {
    if (!inputValue) return Log({ message: "getClassPolls requires an id", level: "warn" });
    try {
        const data = await classApi.getPolls(Number(inputValue));
        Log({ message: 'Get Class Polls:', data });
    } catch (err) { Log({ message: 'Error getting class polls:', data: err, level: "error" }); }
}

async function getClassPollCurrent(inputValue: string) {
    if (!inputValue) return Log({ message: "getClassPollCurrent requires an id", level: "warn" });
    try {
        const data = await classApi.getCurrentPoll(Number(inputValue));
        Log({ message: 'Get Class Current Poll:', data });
    } catch (err) { Log({ message: 'Error getting current poll:', data: err, level: "error" }); }
}

async function clearClassPolls(inputValue: string) {
    if (!inputValue) return Log({ message: "clearClassPolls requires an id", level: "warn" });
    try {
        const data = await classApi.clearCurrentPoll(Number(inputValue));
        Log({ message: 'Clear Class Polls:', data });
    } catch (err) { Log({ message: 'Error clearing polls:', data: err, level: "error" }); }
}

async function createClassPoll(inputValue: string, bodyValue: string) {
    if (!inputValue) return Log({ message: "createClassPoll requires body or name", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(bodyValue); } catch (err) { payload = bodyValue; }
    try {
        const data = await classApi.createPoll(Number(inputValue), payload);
        Log({ message: 'Create Class Poll:', data });
    } catch (err) { Log({ message: 'Error creating poll:', data: err, level: "error" }); }
}

async function endClassPoll(inputValue: string) {
    if (!inputValue) return Log({ message: "endClassPoll requires an id", level: "warn" });
    try {
        const data = await classApi.endPoll(Number(inputValue));
        Log({ message: 'End Class Poll:', data });
    } catch (err) { Log({ message: 'Error ending poll:', data: err, level: "error" }); }
}

async function respondClassPoll(inputValue: string, bodyValue: string) {
    if (!inputValue) return Log({ message: "respondClassPoll requires body", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(bodyValue); } catch (err) { payload = bodyValue; }
    try {
        const data = await classApi.submitPollResponse(Number(inputValue), payload);
        Log({ message: 'Respond Class Poll:', data });
    } catch (err) { Log({ message: 'Error responding to poll:', data: err, level: "error" }); }
}

// --- Class - Breaks ---
async function endOwnBreak(inputValue: string) {
    if (!inputValue) return Log({ message: "endOwnBreak requires an id", level: "warn" });
    try {
        const data = await classApi.endBreak(Number(inputValue));
        Log({ message: 'End Own Break:', data });
    } catch (err) { Log({ message: 'Error ending own break:', data: err, level: "error" }); }
}

async function requestBreak(inputValue: string, bodyValue: string) {
    if (!inputValue) return Log({ message: "requestBreak requires an id", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(bodyValue); } catch (err) { payload = bodyValue; }
    try {
        const data = await classApi.requestBreak(Number(inputValue), payload?.reason || "");
        Log({ message: 'Request Break:', data });
    } catch (err) { Log({ message: 'Error requesting break:', data: err, level: "error" }); }
}

async function approveBreak(inputValue: string) {
    if (!inputValue) return Log({ message: "approveBreak requires 'classId|userId'", level: "warn" });
    const [classId, userId] = inputValue.split('|').map(s => s.trim());
    if (!classId || !userId) return Log({ message: "approveBreak requires 'classId|userId'", level: "warn" });
    try {
        const data = await classApi.approveStudentBreak(Number(classId), userId);
        Log({ message: 'Approve Break:', data });
    } catch (err) { Log({ message: 'Error approving break:', data: err, level: "error" }); }
}

async function denyBreak(inputValue: string) {
    if (!inputValue) return Log({ message: "denyBreak requires 'classId|userId'", level: "warn" });
    const [classId, userId] = inputValue.split('|').map(s => s.trim());
    if (!classId || !userId) return Log({ message: "denyBreak requires 'classId|userId'", level: "warn" });
    try {
        const data = await classApi.denyStudentBreak(Number(classId), userId);
        Log({ message: 'Deny Break:', data });
    } catch (err) { Log({ message: 'Error denying break:', data: err, level: "error" }); }
}

// --- Class - Help ---
async function deleteHelpRequest(inputValue: string) {
    if (!inputValue) return Log({ message: "deleteHelpRequest requires 'classId|userId'", level: "warn" });
    const [classId, userId] = inputValue.split('|').map(s => s.trim());
    if (!classId || !userId) return Log({ message: "deleteHelpRequest requires 'classId|userId'", level: "warn" });
    try {
        const data = await classApi.deleteHelpRequest(Number(classId), userId);
        Log({ message: 'Delete Help Request:', data });
    } catch (err) { Log({ message: 'Error deleting help request:', data: err, level: "error" }); }
}

async function requestClassHelp(inputValue: string) {
    if (!inputValue) return Log({ message: "requestClassHelp requires an id or body", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(inputValue); } catch { payload = { classId: inputValue }; }
    try {
        const data = await classApi.requestHelp(Number(payload.classId || payload.id || inputValue));
        Log({ message: 'Request Class Help:', data });
    } catch (err) { Log({ message: 'Error requesting help:', data: err, level: "error" }); }
}

// --- Class - Tags & Enrollment ---
async function getClassTags() {
    try {
        const data = await classApi.getClassTags(0); // Adjust as needed
        Log({ message: 'Get Class Tags:', data });
    } catch (err) { Log({ message: 'Error getting class tags:', data: err, level: "error" }); }
}

async function joinClassByCode(inputValue: string) {
    if (!inputValue) return Log({ message: "joinClassByCode requires a code or JSON with {code}", level: "warn" });
    let code = inputValue;
    try {
        const parsed = JSON.parse(inputValue); if (parsed.code) code = parsed.code;
    } catch {}
    try {
        const data = await classApi.enrollInClass(code);
        Log({ message: 'Join Class By Code:', data });
    } catch (err) { Log({ message: 'Error joining class by code:', data: err, level: "error" }); }
}

async function setClassTags(inputValue: string) {
    if (!inputValue) return Log({ message: "setClassTags requires a body (JSON) or comma-separated tags", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(inputValue); } catch { payload = { tags: inputValue.split(',').map(s => s.trim()) }; }
    try {
        const data = await classApi.setClassTags(0, payload.tags || []); // Adjust classId as needed
        Log({ message: 'Set Class Tags:', data });
    } catch (err) { Log({ message: 'Error setting class tags:', data: err, level: "error" }); }
}

// --- Class - Links ---
async function removeClassLink(inputValue: string) {
    if (!inputValue) return Log({ message: "removeClassLink requires 'classId|linkId' or classId", level: "warn" });
    if (inputValue.includes('|')) {
        const [classId, linkId] = inputValue.split('|').map(s => s.trim());
        try {
            const data = await classApi.deleteClassLink(Number(classId), linkId);
            Log({ message: 'Remove Class Link (by id):', data });
        } catch (err) { Log({ message: 'Error removing class link:', data: err, level: "error" }); }
    } else {
        try {
            const data = await classApi.deleteClass(Number(inputValue));
            Log({ message: 'Remove Class Link:', data });
        } catch (err) { Log({ message: 'Error removing class link:', data: err, level: "error" }); }
    }
}

async function addClassLink(inputValue: string) {
    if (!inputValue) return Log({ message: "addClassLink requires 'classId|json' or JSON with classId", level: "warn" });
    let payload: any = {};
    let classId = '';
    if (inputValue.includes('|')) {
        const [r, jsonPart] = inputValue.split('|', 2);
        classId = r.trim();
        try { payload = JSON.parse(jsonPart); } catch { payload = { url: jsonPart }; }
    } else {
        try { payload = JSON.parse(inputValue); classId = payload.classId || ''; } catch { return Log({ message: "addClassLink: provide classId|json or valid JSON", level: "warn" }); }
    }
    if (!classId) return Log({ message: "addClassLink requires classId", level: "warn" });
    try {
        const data = await classApi.createClassLink(Number(classId), payload);
        Log({ message: 'Add Class Link:', data });
    } catch (err) { Log({ message: 'Error adding class link:', data: err, level: "error" }); }
}

async function updateClassLink(inputValue: string) {
    if (!inputValue) return Log({ message: "updateClassLink requires 'classId|json' or JSON with classId", level: "warn" });
    let payload: any = {};
    let classId = '';
    if (inputValue.includes('|')) {
        const [r, jsonPart] = inputValue.split('|', 2);
        classId = r.trim();
        try { payload = JSON.parse(jsonPart); } catch { payload = { data: jsonPart }; }
    } else {
        try { payload = JSON.parse(inputValue); classId = payload.classId || ''; } catch { return Log({ message: "updateClassLink: provide classId|json or valid JSON", level: "warn" }); }
    }
    if (!classId) return Log({ message: "updateClassLink requires classId", level: "warn" });
    try {
        const data = await classApi.updateClassLink(Number(classId), payload);
        Log({ message: 'Update Class Link:', data });
    } catch (err) { Log({ message: 'Error updating class link:', data: err, level: "error" }); }
}

// --- Digipogs ---
async function awardDigipogs(inputValue: string) {
    if (!inputValue) return Log({ message: "awardDigipogs requires body JSON or 'userId|amount'", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(inputValue); } catch {
        const [userId, amount] = inputValue.split('|').map(s => s.trim());
        payload = { studentId: userId, amount: Number(amount) || 0 };
    }
    try {
        const data = await digipogApi.awardDigipogs(payload);
        Log({ message: 'Award Digipogs:', data });
    } catch (err) { Log({ message: 'Error awarding digipogs:', data: err, level: "error" }); }
}

async function transferDigipogs(inputValue: string, bodyValue: string) {
    if (!inputValue && !bodyValue) return Log({ message: "transferDigipogs requires body JSON or 'toUserId|amount'", level: "warn" });
    let payload: any;
    try { payload = JSON.parse(bodyValue); } catch {
        payload = JSON.parse(inputValue || '{}');
    }
    try {
        const data = await digipogApi.transferDigipogs(payload);
        Log({ message: 'Transfer Digipogs:', data });
    } catch (err) { Log({ message: 'Error transferring digipogs:', data: err, level: "error" }); }
}

// --- IP Management ---
async function removeIP(inputValue: string) {
    if (!inputValue) return Log({ message: "removeIP requires 'type|id'", level: "warn" });
    const [type, id] = inputValue.split('|').map(s => s.trim());
    if (!type || !id) return Log({ message: "removeIP requires 'type|id'", level: "warn" });
    Log({ message: 'Note: IP management functions not yet implemented in API', level: "warn" });
}

async function getIPList(inputValue: string) {
    if (!inputValue) return Log({ message: "getIPList requires a type", level: "warn" });
    Log({ message: 'Note: IP management functions not yet implemented in API', level: "warn" });
}

async function toggleIP(inputValue: string) {
    if (!inputValue) return Log({ message: "toggleIP requires a type or JSON", level: "warn" });
    Log({ message: 'Note: IP management functions not yet implemented in API', level: "warn" });
}

async function updateIP(inputValue: string) {
    if (!inputValue) return Log({ message: "updateIP requires 'type|id|json' or JSON with type and id", level: "warn" });
    Log({ message: 'Note: IP management functions not yet implemented in API', level: "warn" });
}

// --- Manager / Logs / Student / OAuth / User / Pools ---
async function getManager() {
    try {
        const data = await managerApi.getManagerData();
        Log({ message: 'Get Manager:', data });
    } catch (err) { Log({ message: 'Error getting manager:', data: err, level: "error" }); }
}

async function getLogs() {
    Log({ message: 'Note: Log functions not yet implemented in API', level: "warn" });
}

async function getLogFile(inputValue: string) {
    if (!inputValue) return Log({ message: "getLogFile requires a log name", level: "warn" });
    Log({ message: 'Note: Log functions not yet implemented in API', level: "warn" });
}

async function oauthAuthorize() {
    Log({ message: 'Note: OAuth functions not yet implemented in API', level: "warn" });
}

async function oauthRevoke(inputValue: string) {
    if (!inputValue) return Log({ message: "oauthRevoke requires body (token or json)", level: "warn" });
    Log({ message: 'Note: OAuth functions not yet implemented in API', level: "warn" });
}

async function oauthToken(inputValue: string) {
    if (!inputValue) return Log({ message: "oauthToken requires body", level: "warn" });
    Log({ message: 'Note: OAuth functions not yet implemented in API', level: "warn" });
}

async function getUserTransactions(inputValue: string) {
    if (!inputValue) return Log({ message: "getUserTransactions requires a userId", level: "warn" });
    try {
        const data = await userApi.getUserTransactions(inputValue);
        Log({ message: 'Get User Transactions:', data });
    } catch (err) { Log({ message: 'Error getting user transactions:', data: err, level: "error" }); }
}

async function getUserPools() {
    try {
        // Placeholder - needs API function
        Log({ message: 'Get User Pools - endpoint not yet defined', level: "warn" });
    } catch (err) { Log({ message: 'Error getting user pools:', data: err, level: "error" }); }
}

async function getNotifications() {
    try {
        const data = await notificationApi.getNotifications();
        Log({ message: 'Get Notifications:', data });
    } catch (err) { Log({ message: 'Error getting notifications:', data: err, level: "error" }); }
}

async function getNotifByID(notifId: string) {
    try {
        const data = await notificationApi.getNotificationById(notifId);
        Log({ message: 'Get Notification by ID:', data });
    } catch (err) { Log({ message: 'Error getting notification by ID:', data: err, level: "error" }); }
}

async function markNotifAsRead(notifId: string) {
    try {
        const data = await notificationApi.markNotificationAsRead(notifId);
        Log({ message: 'Mark Notification as Read:', data });
    } catch (err) { Log({ message: 'Error marking notification as read:', data: err, level: "error" }); }
}

async function deleteAllNotif() {
    try {
        const data = await notificationApi.deleteAllNotifications();
        Log({ message: 'Delete Notifications:', data });
    } catch (err) { Log({ message: 'Error deleting notifications:', data: err, level: "error" }); }
}

async function deleteNotifByID(notifId: string) {
    try {
        const data = await notificationApi.deleteNotificationById(notifId);
        Log({ message: 'Delete Notification by ID:', data });
    } catch (err) { Log({ message: 'Error deleting notification by ID:', data: err, level: "error" }); }
}