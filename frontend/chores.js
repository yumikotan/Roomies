console.log('CHORES.JS LOADING - ' + new Date().toISOString());

import { db, auth } from "./firebaseClient.js";
import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import { createChore } from "./Chores/createChore.js";
import { getChores } from "./Chores/getChores.js";
import { updateChore } from "./Chores/updateChores.js";
import { setChoreStatus } from "./Chores/statusUtils.js";
import { rotateChores } from "./Chores/rotationUtils.js";
import { claimVoluntaryChore, setAssignedMembers } from "./Chores/manageAssignments.js";
import { logChoreEvent } from "./Chores/logChoreEvent.js";

console.log('Chores imports successful finally');

let currentEditChoreId = null;
let currentEditHouseholdId = null;
let currentUserHouseholdId = null;


async function getHouseholdMembers(householdId) {
    try {
        const householdRef = doc(db, "Households", householdId);
        const householdSnap = await getDoc(householdRef);
        if (!householdSnap.exists()) {
            console.warn('Household not found');
            return [];
        }
        
        const householdData = householdSnap.data();
        const memberEmails = householdData.members || [];
        
        //full profiles for each member
        const membersWithProfiles = [];
        for (const email of memberEmails) {
            try {
                const q = query(
                    collection(db, "ProfileUsers"),
                    where("email", "==", email)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const userData = snap.docs[0].data();
                    membersWithProfiles.push({
                        email: email,
                        name: userData.name || email.split('@')[0],
                        icon: userData.icon,
                        uid: userData.uid
                    });
                } else {
                    membersWithProfiles.push({
                        email: email,
                        name: email.split('@')[0],
                        icon: null
                    });
                }
            } catch (err) {
                console.error("Error fetching member profile:", err);
                membersWithProfiles.push({
                    email: email,
                    name: email.split('@')[0],
                    icon: null
                });
            }
        }
        
        return membersWithProfiles;
    } catch (error) {
        console.error('Error getting household members:', error);
        return [];
    }
}

async function showMembersChores(householdId) {
    const container = document.getElementById("memberChoresContainer");
    if (!container) {
        console.warn('memberChoresContainer not found');
        return;
    }
    
    try {
        const members = await getHouseholdMembers(householdId);
        const choresResult = await getChores(householdId);
        
        if(!choresResult.success) {
            container.innerHTML = '<p style="color: #234029; text-align: center;">Failed to load chores</p>';
            return;
        }
        const chores = choresResult.chores || [];
        container.innerHTML = '';
        members.forEach(member => {
            const memberChores = chores.filter(c => 
                c.assigned_members && c.assigned_members.includes(member.email)
            );
            
            
            const memberSection = document.createElement('div');
            memberSection.style.background = '#6fa573';
            memberSection.style.borderRadius = '16px';
            memberSection.style.padding = '16px';
            memberSection.style.marginTop = '20px';
            memberSection.style.marginBottom = '16px';
            memberSection.style.width = '95%';
            memberSection.style.maxWidth = '800px';
            memberSection.style.marginLeft = 'auto';
            memberSection.style.marginRight = 'auto';
            const memberHeader = document.createElement('div');
            memberHeader.style.display = 'flex';
            memberHeader.style.alignItems = 'center';
            memberHeader.style.gap = '10px';
            memberHeader.style.marginTop = '8px';
            memberHeader.style.marginBottom = '12px';
            memberHeader.style.paddingLeft = '8px';
            
         
         
            const profilePic = document.createElement('div');
            profilePic.className = 'member-avatar';
            
            if (member.icon && member.icon !== 'default.png') {
                const img = document.createElement('img');
                img.src = member.icon;
                img.onerror = () => {
                    profilePic.innerHTML = '';
                    profilePic.textContent = member.name[0].toUpperCase();
                };
                profilePic.appendChild(img);
            } else{
                profilePic.textContent = member.name[0].toUpperCase();
            }
            
            const memberTitle = document.createElement('h3');
            memberTitle.textContent = member.name;
            memberTitle.style.color = '#ffffff';
            memberTitle.style.fontSize = '16px';
            memberTitle.style.margin = '0';
            memberTitle.style.fontWeight = '700';
            
            
            memberHeader.appendChild(profilePic);
            memberHeader.appendChild(memberTitle);
            memberSection.appendChild(memberHeader);
            
            if(memberChores.length === 0) {
                const noChores = document.createElement('p');
                noChores.textContent = 'No chores assigned';
                noChores.style.color = '#ffffff';
                noChores.style.fontSize = '14px';
                noChores.style.fontWeight = 'bold';
                memberSection.appendChild(noChores);
            }else {
                memberChores.forEach(chore => {
                    const choreCard = createChoreCard(chore, householdId);
                    memberSection.appendChild(choreCard);
                });
            }
            container.appendChild(memberSection);
        });
        
        //unassigned chores
        const voluntaryChores = chores.filter(c => !c.assigned_members || c.assigned_members.length === 0);
        
        if(voluntaryChores.length > 0) {
            const voluntarySection = document.createElement('div');
            voluntarySection.style.background = '#6fa573';
            voluntarySection.style.borderRadius = '16px';
            voluntarySection.style.padding = '16px';
            voluntarySection.style.marginTop = '40px';
            voluntarySection.style.marginBottom = '16px';
            voluntarySection.style.width = '95%';
            voluntarySection.style.maxWidth = '800px';
            voluntarySection.style.marginLeft = 'auto';
            voluntarySection.style.marginRight = 'auto';
            
            const voluntaryTitle = document.createElement('h3');
            voluntaryTitle.textContent = 'Voluntary Chores';
            voluntaryTitle.style.color = '#ffffff';
            voluntaryTitle.style.fontSize = '16px';
            voluntaryTitle.style.margin = '8px 0 20px 0';
            voluntaryTitle.style.paddingLeft = '8px';
            voluntaryTitle.style.fontWeight = '700';
            voluntarySection.appendChild(voluntaryTitle);
            
            voluntaryChores.forEach(chore => {
                const choreCard = createChoreCard(chore, householdId);
                voluntarySection.appendChild(choreCard);
            });
            container.appendChild(voluntarySection);
        }
        console.log('Chores displayed for', members.length, 'members');
    } catch (error) {
        console.error('Error showing member chores:', error);
        container.innerHTML = '<p style="color: #d9534f; text-align: center;">Error loading chores</p>';
    }
}

function createChoreCard(chore, householdId) {
    const card = document.createElement('div');
    card.style.background = '#ffffff';
    card.style.borderRadius = '16px';
    card.style.padding = '20px';
    card.style.paddingBottom = '50px';
    card.style.marginBottom = '10px';
    card.style.position = 'relative';
    card.style.minHeight = '120px';
    card.style.width = '95%';
    card.style.maxWidth = '800px';
    card.style.marginLeft = 'auto';
    card.style.marginRight = 'auto';
    
 
    const isOverdue = chore.due_date && chore.status !== 'completed' && chore.status !== 'skipped' && new Date(chore.due_date.seconds * 1000) < new Date();
    if (isOverdue) {
        card.style.border = '3px solid #dc3545';
        card.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.25)';
    }else {
        card.style.border = '2px solid #c6e5cd';
        card.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.08)';
    }
    
    const title = document.createElement('h4');
    title.textContent = chore.title;
    title.style.color = '#2d5a36';
    title.style.fontSize = '16px';
    title.style.margin = '0 0 8px';
    title.style.fontWeight = '700';
    
    //description, assigned to, due time, due date
    const infoContainer = document.createElement('div');
    infoContainer.style.fontSize = '13px';
    infoContainer.style.color = '#2d5a36';
    infoContainer.style.marginBottom = '8px';
    infoContainer.style.lineHeight = '1.6';
    
    let infoLines = [];
    if (chore.description && chore.description.trim()) {
        infoLines.push(`<strong>Description:</strong> ${chore.description}`);
    }
    if (chore.assigned_members && chore.assigned_members.length > 0) {
        infoLines.push(`<strong>Assigned to:</strong> ${chore.assigned_members[0]}`);
    }
    
    //convert times
    if (chore.due_time) {
        const [hours, minutes] = chore.due_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const formattedTime = `${displayHour}:${minutes} ${ampm}`;
        infoLines.push(`<strong>Due time:</strong> ${formattedTime}`);
    }
    
    if (chore.due_date) {
        const dueDate = new Date(chore.due_date.seconds * 1000);
        const formattedDate = `${(dueDate.getMonth() + 1).toString().padStart(2, '0')}/${dueDate.getDate().toString().padStart(2, '0')}/${dueDate.getFullYear().toString().slice(-2)}`;
        infoLines.push(`<strong>Due date:</strong> ${formattedDate}`);
    }
    infoContainer.innerHTML = infoLines.join('<br>');
    
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.gap = '8px';
    statusContainer.style.alignItems = 'center';
    statusContainer.style.marginBottom = '0';
    statusContainer.style.position = 'absolute';
    statusContainer.style.top = '14px';
    statusContainer.style.right = '14px';
    
   
    const statusIcon = document.createElement('img');
    statusIcon.style.objectFit = 'contain';
    
    if (chore.status === 'completed') {
        statusIcon.src = './img/check (1).png';
        statusIcon.alt = 'Completed';
        statusIcon.style.width = '20px';
        statusIcon.style.height = '20px';
    } else if (chore.status === 'in_progress') {
        statusIcon.src = './img/wall-clock.png';
        statusIcon.alt = 'In Progress';
        statusIcon.style.width = '20px';
        statusIcon.style.height = '20px';
        statusIcon.style.filter = 'brightness(0) saturate(100%) invert(67%) sepia(99%) saturate(1367%) hue-rotate(1deg) brightness(102%) contrast(101%)';
    } else {
        statusIcon.src = './img/x.png';
        statusIcon.alt = 'Not Done';
        statusIcon.style.width = '18px';
        statusIcon.style.height = '18px';
    }
    statusContainer.appendChild(statusIcon);
    
  
    if (isOverdue) {
        const overdueTag = document.createElement('span');
        overdueTag.textContent = ' OVERDUE';
        overdueTag.style.fontSize = '11px';
        overdueTag.style.padding = '4px 8px';
        overdueTag.style.borderRadius = '12px';
        overdueTag.style.background = '#dc3545';
        overdueTag.style.color = 'white';
        overdueTag.style.fontWeight = '700';
        overdueTag.style.display = 'inline-block';
        statusContainer.appendChild(overdueTag);
    }
    
    const buttonRow = document.createElement('div');
    buttonRow.style.position = 'absolute';
    buttonRow.style.bottom = '14px';
    buttonRow.style.left = '14px';
    buttonRow.style.right = '50px';
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '6px';
    buttonRow.style.flexWrap = 'wrap';
    buttonRow.style.justifyContent = 'flex-start';
    
 
    if (chore.status !== 'completed' && chore.status !== 'skipped' && chore.status !== 'in_progress') {
        const inProgressBtn = document.createElement('button');
        inProgressBtn.innerHTML = '<img src="./img/wall-clock.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px; filter: brightness(0) invert(1);"> Start';
        inProgressBtn.style.flex = '0 0 auto';
        inProgressBtn.style.padding = '6px 12px';
        inProgressBtn.style.borderRadius = '8px';
        inProgressBtn.style.border = 'none';
        inProgressBtn.style.background = '#d89c00';
        inProgressBtn.style.color = 'white';
        inProgressBtn.style.fontSize = '11px';
        inProgressBtn.style.fontWeight = '600';
        inProgressBtn.style.cursor = 'pointer';
        
        inProgressBtn.addEventListener('click', async () => {
            const result = await setChoreStatus(householdId, chore.id, 'in_progress');
            if (result.success) {
                await logChoreEvent(householdId, chore.id, {
                    action: 'started',
                    performed_by: auth.currentUser?.email || 'unknown'
                });
                showMembersChores(householdId);
            }
        });
        buttonRow.appendChild(inProgressBtn);
    }
    
 
    if (chore.status !== 'completed' && chore.status !== 'skipped') {
        const completeBtn = document.createElement('button');
        completeBtn.innerHTML = '<img src="./img/check (1).png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px; filter: brightness(0) invert(1);"> Complete';
        completeBtn.style.flex = '0 0 auto';
        completeBtn.style.padding = '6px 12px';
        completeBtn.style.borderRadius = '8px';
        completeBtn.style.border = 'none';
        completeBtn.style.background = '#6fa573';
        completeBtn.style.color = 'white';
        completeBtn.style.fontSize = '11px';
        completeBtn.style.fontWeight = '600';
        completeBtn.style.cursor = 'pointer';
        //make button wider when Start button is not present status is in_progress
        if (chore.status === 'in_progress') {
            completeBtn.style.width = '150px';
            completeBtn.style.padding = '6px 24px';
        }
        
        
        completeBtn.addEventListener('click', async () => {
            const result = await setChoreStatus(householdId, chore.id, 'completed');
            if (result.success) {
                await logChoreEvent(householdId, chore.id, {
                    action: 'completed',
                    performed_by: auth.currentUser?.email || 'unknown'
                });
                showMembersChores(householdId);
            }
        });
        buttonRow.appendChild(completeBtn);
    }
    
    //undo button for completed/skipped chores
    if (chore.status === 'completed' || chore.status === 'skipped') {
        const undoBtn = document.createElement('button');
        undoBtn.innerHTML = '<img src="./img/x.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px; filter: brightness(0) invert(1);"> Undo Complete';
        undoBtn.style.flex = '0 0 auto';
        undoBtn.style.width = '170px';
        undoBtn.style.padding = '6px 20px';
        undoBtn.style.borderRadius = '8px';
        undoBtn.style.border = 'none';
        undoBtn.style.background = '#17a2b8';
        undoBtn.style.color = 'white';
        undoBtn.style.fontSize = '11px';
        undoBtn.style.fontWeight = '600';
        undoBtn.style.cursor = 'pointer';
        
        undoBtn.addEventListener('click', async () => {
            const result = await setChoreStatus(householdId, chore.id, 'pending');
            if (result.success) {
                await logChoreEvent(householdId, chore.id, {
                    action: 'undone',
                    performed_by: auth.currentUser?.email || 'unknown'
                });
                showMembersChores(householdId);
            }
        });
        buttonRow.appendChild(undoBtn);
    }
    


    const editBtn = document.createElement('button');
    editBtn.style.position = 'absolute';
    editBtn.style.bottom = '14px';
    editBtn.style.right = '14px';
    editBtn.style.padding = '0';
    editBtn.style.border = 'none';
    editBtn.style.background = 'none';
    editBtn.style.cursor = 'pointer';
    editBtn.style.boxShadow = 'none';
    
    const editIcon = document.createElement('img');
    editIcon.src = './img/edit.png';
    editIcon.style.width = '20px';
    editIcon.style.height = 'auto';
    editIcon.style.display = 'block';
    editBtn.appendChild(editIcon);
    
    editBtn.addEventListener('click', () => {
        currentEditChoreId = chore.id;
        currentEditHouseholdId = householdId;
        openEditChoreModal(chore, householdId);
    });
    
    card.appendChild(title);
    card.appendChild(infoContainer);
    card.appendChild(statusContainer);
    if (buttonRow) card.appendChild(buttonRow);
    card.appendChild(editBtn);
    
    return card;
}


async function openEditChoreModal(chore, householdId) {
    document.getElementById('edit-chore-title').value = chore.title || '';
    document.getElementById('edit-chore-description').value = chore.description || '';
    document.getElementById('edit-chore-dueDate').value = chore.due_date ? new Date(chore.due_date.seconds * 1000).toISOString().split('T')[0] : '';
    document.getElementById('edit-chore-dueTime').value = chore.due_time || '';
    
 
    const assignmentTypeDropdown = document.getElementById('edit-chore-assignment-type');
    if (assignmentTypeDropdown) {
        assignmentTypeDropdown.value = chore.assignment_type || 'single';
    }
    
  
    const statusDropdown = document.getElementById('edit-chore-status');
    if (statusDropdown) {
        statusDropdown.value = chore.status || 'pending';
    }
    
    
    const members = await getHouseholdMembers(householdId);
    const assignedDropdown = document.getElementById('edit-assigned-to-dropdown');
    assignedDropdown.innerHTML = '';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.email;
        option.textContent = member.name || member.email.split('@')[0];
        if (chore.assigned_members && chore.assigned_members.includes(member.email)) {
            option.selected = true;
        }
        assignedDropdown.appendChild(option);
    });
    
    //show/hide rotation sections based on assignment type
    const rotationOrderSection = document.getElementById('edit-rotation-order-section');
    const rotationFrequencySection = document.getElementById('edit-rotation-frequency-section');
    
    if (chore.assignment_type === 'rotating') {
        rotationOrderSection.style.display = 'block';
        rotationFrequencySection.style.display = 'block';
        populateEditRotationOrder(chore.rotational_order || chore.assigned_members || [], members);
        window.editSelectedFrequency = chore.rotational_freq || 'weekly';
    }else{
        rotationOrderSection.style.display = 'none';
        rotationFrequencySection.style.display = 'none';
    }
    document.getElementById('edit-chore-modal').classList.remove('hidden');
}


function populateEditRotationOrder(rotationOrder, members) {
    const container = document.getElementById('edit-rotation-order-list');
    container.innerHTML = '';
    
    
    rotationOrder.forEach((email, index) => {
        const member = members.find(m => m.email === email);
        const memberName = member?.name || email.split('@')[0];
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #c6e5cd;';
    
        const dateRange = getRotationDateRange(index);
        row.innerHTML = `
            <span style="font-weight: 600;">${memberName} ${index === 0 ? '(You)' : ''}</span>
            <span style="color: #666; font-size: 12px;">${dateRange}</span>
        `;
        
        container.appendChild(row);
    });
}

function getRotationDateRange(index) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (index * 7)); // Assuming weekly rotation
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const formatDate = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${month}/${day}/${year}`;
    };
    return `${formatDate(startDate)}-${formatDate(endDate)}`;
}


async function populateEditMembersCheckboxes(householdId, assignedMembers) {
    const members = await getHouseholdMembers(householdId);
    const container = document.getElementById("selectEditMembers-CheckBox");
    if (!container) return;
    
    container.innerHTML = "";
    members.forEach(email => {
        const label = document.createElement("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.marginBottom = "8px";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = email;
        checkbox.checked = assignedMembers.includes(email);
        checkbox.style.marginRight = "8px";
        
        const span = document.createElement("span");
        span.textContent = email;
        span.style.fontSize = "14px";
        span.style.color = "#234029";
        
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
    
}


async function populateMembersCheckboxes(householdId) {
    const members = await getHouseholdMembers(householdId);
    const container = document.getElementById("selectMembers-CheckBox");
    if (!container) return;
    container.innerHTML = "";
    container.style.cssText = "display: flex; flex-direction: column; align-items: flex-start; width: 100%;";
    
    if (!members || members.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">No household members found</p>';
        return;
    }
    members.forEach(member => {
        const label = document.createElement("label");
        label.style.cssText = "display: flex; align-items: center; padding: 8px 0; cursor: pointer; gap: 16px;";
        
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = member.email;
        checkbox.style.cssText = "margin: 0; cursor: pointer; flex-shrink: 0; width: 16px; height: 16px;";
        
        const span = document.createElement("span");
        span.textContent = member.email;
        span.style.cssText = "color: #234029 !important; font-size: 14px !important; line-height: 1.4; margin: 0; flex: 1;";
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}


async function initChoresView() {
    console.log('Initializing chores view');
    const user = auth.currentUser;
    if (!user) {
        console.warn('No user logged in');
        return;
    }
    
    const userDoc = await getDoc(doc(db, "ProfileUsers", user.uid));
    if (!userDoc.exists()) {
        console.warn('User profile not found');
        return;
    }
    
    const userData = userDoc.data();
    currentUserHouseholdId = userData.group_id;
    console.log('Current household ID set to:', currentUserHouseholdId);
    if (currentUserHouseholdId) {
        await rotateChores(currentUserHouseholdId);
        await showMembersChores(currentUserHouseholdId);
    } else{
        
        const container = document.getElementById("memberChoresContainer");
        if (container) {
            container.innerHTML = '<p style="color: #234029; text-align: center; padding: 40px;">No chores yet</p>';
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('Chores DOMContentLoaded');
    const assignmentTypeDropdown = document.getElementById("DropBox-ChoreAssignmentType");
    const rotationFreqContainer = document.getElementById("rotation-frequency-container");
    const rotationFreqDropdown = document.getElementById("DropBox-RotationFrequency");
    const customRotationDays = document.getElementById("custom-rotation-days");
    
    if (assignmentTypeDropdown && rotationFreqContainer) {
        assignmentTypeDropdown.addEventListener('change', () => {
            if (assignmentTypeDropdown.value === 'rotating') {
                rotationFreqContainer.style.display = 'block';
            } else {
                
                rotationFreqContainer.style.display = 'none';
            }
        });
    }
    
    if (rotationFreqDropdown && customRotationDays) {
        rotationFreqDropdown.addEventListener('change', () => {
            if (rotationFreqDropdown.value === 'custom') {
                customRotationDays.style.display = 'block';
            }else {
                customRotationDays.style.display = 'none';
            }
        });
    }
    
   
    const editAssignmentTypeDropdown = document.getElementById("DropBox-edit-ChoreAssignmentType");
    const editRotationFreqContainer = document.getElementById("edit-rotation-frequency-container");
    const editRotationFreqDropdown = document.getElementById("DropBox-edit-RotationFrequency");
    const editCustomRotationDays = document.getElementById("edit-custom-rotation-days");
    
    if (editAssignmentTypeDropdown && editRotationFreqContainer) {
        editAssignmentTypeDropdown.addEventListener('change', () => {
            if(editAssignmentTypeDropdown.value === 'rotating') {
                editRotationFreqContainer.style.display = 'block';
            } else {
                editRotationFreqContainer.style.display = 'none';
            }
        });
    }
    
    if (editRotationFreqDropdown && editCustomRotationDays) {
        editRotationFreqDropdown.addEventListener('change', () => {
            if (editRotationFreqDropdown.value === 'custom') {
                editCustomRotationDays.style.display = 'block';
            }else{
                editCustomRotationDays.style.display = 'none';
            }
        });
    }
    
 
    const editRotationOrderToggle = document.getElementById('edit-rotation-order-toggle');
    const editRotationOrderContent = document.getElementById('edit-rotation-order-content');
    const editRotationOrderArrow = document.getElementById('edit-rotation-order-arrow');
    
    if (editRotationOrderToggle) {
        editRotationOrderToggle.addEventListener('click', () => {
            if (editRotationOrderContent.style.display === 'none') {
                editRotationOrderContent.style.display = 'block';
                editRotationOrderArrow.textContent = 'âˆ§';
            } else {
                editRotationOrderContent.style.display = 'none';
                editRotationOrderArrow.textContent = 'âˆ¨';
            }
        });
    }
    

    const editRotationFrequencyToggle = document.getElementById('edit-rotation-frequency-toggle');
    const editRotationFrequencyContent = document.getElementById('edit-rotation-frequency-content');
    const editRotationFrequencyArrow = document.getElementById('edit-rotation-frequency-arrow');
    
    if (editRotationFrequencyToggle) {
        editRotationFrequencyToggle.addEventListener('click', () => {
            if (editRotationFrequencyContent.style.display === 'none') {
                editRotationFrequencyContent.style.display = 'block';
                editRotationFrequencyArrow.textContent = 'âˆ§';
            } else {
                editRotationFrequencyContent.style.display = 'none';
                editRotationFrequencyArrow.textContent = 'âˆ¨';
            }
        });
    }
    
 
    if (editRotationFrequencyContent) {
        editRotationFrequencyContent.querySelectorAll('div').forEach(div => {
            div.addEventListener('click', () => {
                const freq = div.getAttribute('data-freq');
                window.editSelectedFrequency = freq;
             
                editRotationFrequencyContent.querySelectorAll('div').forEach(d => {
                    d.style.background = '#e8f5e9';
                    d.style.fontWeight = 'normal';
                });
                div.style.background = '#c3e6cb';
                div.style.fontWeight = '600';
                
                // Show/hide custom input
                const customDaysInput = document.getElementById('edit-custom-rotation-days');
                if (freq === 'custom') {
                    customDaysInput.style.display = 'block';
                } else{
                    customDaysInput.style.display = 'none';
                }
            });
        });
    }
    
  
    const btnAddChoreHeader = document.getElementById("btn-addChore-header");
    console.log('Add Chore header button found:', !!btnAddChoreHeader);
    if (btnAddChoreHeader) {
        btnAddChoreHeader.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add Chore clicked- Household ID:', currentUserHouseholdId);
            if (currentUserHouseholdId) {
                await populateMembersCheckboxes(currentUserHouseholdId);
            }
            console.log('Opening add chore modal');
            try {
                //open modal instead of changing view
                document.getElementById("add-chore-modal").classList.remove("hidden");
                console.log('Add chore modal opened');
            } catch (err) {
                console.error('Error opening modal:', err);
            }
        });
        console.log('Add Chore event listener registered');
    }
    
    
    const formAddChore = document.getElementById("form-add-chore");
    if (formAddChore) {
        formAddChore.addEventListener("submit", async (e) => {
            e.preventDefault();
            const title = document.getElementById("addChore-title").value.trim();
            const description = document.getElementById("addChore-description").value.trim();
            const dueDate = document.getElementById("addChore-dueDate").value;
            const dueTime = document.getElementById("addChore-dueTime").value;
            const assignmentType = document.getElementById("DropBox-ChoreAssignmentType").value;
            
            if (!title) {
                showCustomAlert('Please enter a chore title!');
                return;
            }
            
            // Get selected members
            const checkboxes = document.querySelectorAll("#selectMembers-CheckBox input[type='checkbox']:checked");
            const assignedMembers = Array.from(checkboxes).map(cb => cb.value);
            
            const choreData = {
                title,
                description,
                due_date: dueDate,
                due_time: dueTime,
                assignment_type: assignmentType,
                assigned_members: assignedMembers
            };
            
            if (assignmentType === 'rotating') {
                const rotationFreq = document.getElementById("DropBox-RotationFrequency").value;
                choreData.rotational_freq = rotationFreq;
                
                if (rotationFreq === 'custom') {
                    const customDays = document.getElementById("custom-rotation-days").value;
                    choreData.custom_rotation_days = parseInt(customDays) || 7;
                }
                choreData.rotational_order = assignedMembers;
            }
            
            const result = await createChore(currentUserHouseholdId, choreData);
            
            if (result.success) {
                showCustomAlert('Chore created successfully!');
                document.getElementById("addChore-title").value = '';
                document.getElementById("addChore-description").value = '';
                document.getElementById("addChore-dueDate").value = '';
                document.getElementById("addChore-dueTime").value = '';
                //close modal instead of changing view
                document.getElementById("add-chore-modal").classList.add("hidden");
                await showMembersChores(currentUserHouseholdId);
            } else {
                showCustomAlert('Failed to create chore: ' + result.message);
            }
        });
    }
    const btnEditSaveChore = document.getElementById("btn-editsaveChore");
    
    if (btnEditSaveChore) {
        btnEditSaveChore.addEventListener("click", async () => {
            if (!currentEditChoreId || !currentEditHouseholdId) {
                showCustomAlert('No chore selected for editing!');
                return;
            }
            
            const title = document.getElementById("edit-chore-title").value.trim();
            const description = document.getElementById("edit-chore-description").value.trim();
            const dueDate = document.getElementById("edit-chore-dueDate").value;
            const dueTime = document.getElementById("edit-chore-dueTime").value;
            const assignedTo = document.getElementById("edit-assigned-to-dropdown").value;
            const status = document.getElementById("edit-chore-status").value;
            const assignmentType = document.getElementById("edit-chore-assignment-type").value;
            
            
            if (!title) {
                showCustomAlert('Please enter a chore title!');
                return;
            }
            const updates = {
                title,
                description,
                assigned_members: [assignedTo],
                due_time: dueTime,
                status: status,
                assignment_type: assignmentType
            };
            
            if (dueDate) {
                updates.due_date = Timestamp.fromDate(new Date(dueDate));
            }
            
         
            if (assignmentType === 'rotating') {
                updates.rotational_freq = window.editSelectedFrequency || 'weekly';
                
                if (window.editSelectedFrequency === 'custom') {
                    const customDays = document.getElementById("edit-custom-rotation-days").value;
                    updates.custom_rotation_days = parseInt(customDays) || 7;
                }
            }
            
            const result = await updateChore(currentEditHouseholdId, currentEditChoreId, updates);
            
            if (result.success) {
                document.getElementById('edit-chore-modal').classList.add('hidden');
                await showMembersChores(currentEditHouseholdId);
            } else {
                showCustomAlert('Failed to update chore: ' + result.message);
            }
        });
    }
    

    const btnDeleteChore = document.getElementById("btn-delete-chore");
    if (btnDeleteChore) {
        btnDeleteChore.addEventListener("click", async () => {
            if (!currentEditChoreId || !currentEditHouseholdId) {
                showCustomAlert('No chore selected for deletion!');
                return;
            }
            
            const confirmDelete = confirm('Are you sure you want to delete this chore? This action cannot be undone.');
            if (!confirmDelete) return;
            try {
                const choreRef = doc(db, 'Households', currentEditHouseholdId, 'Chores', currentEditChoreId);
                await deleteDoc(choreRef);
                showCustomAlert('Chore deleted successfully!');
                document.getElementById('edit-chore-modal').classList.add('hidden');
                await showMembersChores(currentEditHouseholdId);
                
                currentEditChoreId = null;
                currentEditHouseholdId = null;
            } catch (error) {
                console.error('Error deleting chore:', error);
                showCustomAlert('Failed to delete chore: ' + error.message);
            }
        });
    }
    console.log('Chores event listeners registered');
});


window.initChoresView = initChoresView;
window.showMembersChores = showMembersChores;
console.log('Chores.js loaded completely');
