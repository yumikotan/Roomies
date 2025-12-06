console.log('ROOMMATEAGREEMENT.JS LOADING - ' + new Date().toISOString());

import {
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAgreement, createOrUpdateAgreement } from "./agreementId.js";
import { auth, db } from "./firebaseClient.js";

console.log('roommateAgreement imports successful');

const sections = {};
let currentHouseholdId = null;
let currentHouseholdAdminEmail = null;
const templateSections = {
    "Quiet Hours": {
        description: "Set quiet hours to respect everyone's sleep and study time.",
        fields: [
            { label: "Weekday quiet hours", placeholder: "e.g., 10 PM - 8 AM" },
            { label: "Weekend quiet hours", placeholder: "e.g., 11 PM - 9 AM" }
        ]
    },
    "Cleanliness & Chores": {
        description: "Define cleanliness expectations and chore responsibilities.",
        fields: [
            { label: "Shared space cleaning frequency", placeholder: "e.g., Kitchen cleaned daily, bathroom weekly" },
            { label: "Personal mess policy", placeholder: "e.g., Clean up within 24 hours" }
        ]
    },
    "Guest Policy": {
        description: "Guidelines for having guests over.",
        fields: [
            { label: "Overnight guest policy", placeholder: "e.g., Notify 24 hours in advance, max 3 nights/week" },
            { label: "Daytime guest policy", placeholder: "e.g., Guests welcome anytime, notify if staying past midnight" }
        ]
    },
    "Shared Expenses": {
        description: "How household expenses will be split.",
        fields: [
            { label: "Bill splitting method", placeholder: "e.g., Split evenly, use Venmo by 5th of month" },
            { label: "Shared grocery policy", placeholder: "e.g., Take turns buying basics, label personal items" }
        ]
    },
    "Kitchen Usage": {
        description: "Rules for using the shared kitchen.",
        fields: [
            { label: "Dish cleaning policy", placeholder: "e.g., Wash dishes within 2 hours of use" },
            { label: "Food storage policy", placeholder: "e.g., Label all items, clean fridge weekly" }
        ]
    },
    "Personal Space & Boundaries": {
        description: "Respecting privacy and personal belongings.",
        fields: [
            { label: "Bedroom privacy", placeholder: "e.g., Knock before entering, closed door means do not disturb" },
            { label: "Borrowing items", placeholder: "e.g., Always ask before borrowing, return items same day" }
        ]
    },
    "Noise Levels": {
        description: "Expectations for noise during the day.",
        fields: [
            { label: "Music/TV volume", placeholder: "e.g., Keep volume at conversational level in shared spaces" },
            { label: "Phone calls", placeholder: "e.g., Take long calls in bedroom or outside" }
        ]
    },
    "Conflict Resolution": {
        description: "How to handle disagreements respectfully.",
        fields: [
            { label: "Communication method", placeholder: "e.g., Address issues within 48 hours, talk in person first" },
            { label: "Meeting frequency", placeholder: "e.g., Monthly household check-in meetings" }
        ]
    }
};

//window.show for navigation
function showAgreementView(viewName) {
    console.log('showAgreementView called with:', viewName);
    if (window.show) {
        const viewMap = {
            "roommateAgreement": "roommateAgreement",
            "createRoommateAgreement": "createRoommateAgreement"
        };
        const mappedView = viewMap[viewName] || viewName;
        console.log('Showing view:', mappedView);
        window.show(mappedView);
        
        
        setTimeout(() => {
            const viewElement = document.getElementById('view-' + mappedView);
            console.log('View element:', viewElement);
            console.log('View has "hidden" class?', viewElement?.classList.contains('hidden'));
            console.log('View display style:', viewElement ? window.getComputedStyle(viewElement).display : 'N/A');
            
           
            if (viewElement && viewElement.classList.contains('hidden')) {
                console.warn('view still hidden! Forcing visibility...');
                // Hide all views first
                document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
               
                viewElement.classList.remove('hidden');
                console.log('forced view visible, checking again:', !viewElement.classList.contains('hidden'));
            }
        }, 100);
    } else {
        console.error('window.show is not defined!');
    }
}


function showAgreementSections() {
    console.log('showAgreementSections called');
    const container = document.getElementById("agreementSections");
    console.log('Container element:', container);
    console.log('Container parent:', container?.parentElement);
    console.log('Container visible?', container ? window.getComputedStyle(container).display : 'N/A');
    
    if (!container) {
        console.warn('agreementSections container not found!');
        return;
    }

    container.innerHTML = "";
    const keys = Object.keys(sections);
    console.log('Number of sections:', keys.length);
    
    if(keys.length === 0) {
        const emptyHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <img src="./img/roomagree.png" style="width: 48px; height: 48px; margin-bottom: 16px; object-fit: contain;" alt="Roommate Agreement" />
                <h3 style="color: #315935; font-size: 18px; margin: 0 0 8px;">No Agreement Yet</h3>
                <p style="color: #234029; font-size: 14px; margin: 0; line-height: 1.5;">
                    Create a roommate agreement to set expectations and guidelines for your household.
                </p>
            </div>
        `;

        container.innerHTML = emptyHTML;

        console.log('Empty state HTML set:', container.innerHTML.length, 'characters');
        console.log('Continer offsetHeight:', container.offsetHeight);
        console.log('Container scrollHeight:', container.scrollHeight);
        return;
    }
    
    keys.forEach(title => {
        const value = sections[title];
        
        const sectionBox = document.createElement("div");
        sectionBox.classList.add("sectionDisplay-box");
        
        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = title;
        sectionTitle.classList.add("display-section-title");

        const sectionDescription = document.createElement("p");
        sectionDescription.textContent = value.description;
        sectionDescription.classList.add("display-section-description");

        sectionBox.appendChild(sectionTitle);
        sectionBox.appendChild(sectionDescription);
        
      
        if (value.fields && Array.isArray(value.fields)) {
            value.fields.forEach(field => {
                if (field.value) {
                    const fieldDisplay = document.createElement("div");
                    fieldDisplay.style.marginTop = "8px";
                    fieldDisplay.style.paddingLeft = "12px";
                    fieldDisplay.style.borderLeft = "3px solid #6fa573";
                    
                    const fieldLabel = document.createElement("strong");
                    fieldLabel.textContent = field.label + ": ";
                    fieldLabel.style.color = "#315935";
                    fieldLabel.style.fontSize = "13px";
                    
                    const fieldValue = document.createElement("span");
                    fieldValue.textContent = field.value;
                    fieldValue.style.color = "#234029";
                    fieldValue.style.fontSize = "13px";
                    
                    fieldDisplay.appendChild(fieldLabel);
                    fieldDisplay.appendChild(fieldValue);
                    sectionBox.appendChild(fieldDisplay);
                }
            });
        }
        
        container.appendChild(sectionBox);
    });
    console.log('Sections rendered successfully');
}


function showEditSections() {
    console.log('showEditSections called');
    const container = document.getElementById("editableSectionsContainer");
    if (!container) {
        console.warn('editableSectionsContainer not found!');
        return;
    }

    container.innerHTML = "";
    const keys = Object.keys(sections);
    
    // Show existing sections with fillable fields
    keys.forEach(title => {
        const value = sections[title];
        
        const sectionBox = document.createElement("div");
        sectionBox.classList.add("section-edit-box");
        sectionBox.style.background = "#ffffff";
        sectionBox.style.borderRadius = "16px";
        sectionBox.style.padding = "16px";
        sectionBox.style.marginBottom = "16px";
        sectionBox.style.border = "2px solid #c6e5cd";
        sectionBox.style.position = "relative";
        
        
        
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "×";
        deleteBtn.classList.add("delete-circle");
        deleteBtn.style.position = "absolute";
        deleteBtn.style.top = "12px";
        deleteBtn.style.right = "12px";
        deleteBtn.style.width = "28px";
        deleteBtn.style.height = "28px";
        deleteBtn.style.borderRadius = "50%";
        deleteBtn.style.border = "2px solid #e74c3c";
        deleteBtn.style.background = "white";
        deleteBtn.style.color = "#e74c3c";
        deleteBtn.style.fontSize = "20px";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.display = "flex";
        deleteBtn.style.alignItems = "center";
        deleteBtn.style.justifyContent = "center";
        deleteBtn.style.padding = "0";
        deleteBtn.style.lineHeight = "1";
        deleteBtn.addEventListener("click", () => {
            delete sections[title];
            showEditSections();
        });
        
        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = title;
        sectionTitle.style.color = "#315935";
        sectionTitle.style.fontSize = "16px";
        sectionTitle.style.fontWeight = "800";
        sectionTitle.style.margin = "0 0 8px 0";
        sectionTitle.style.paddingRight = "40px"; // Make room for delete button

        const sectionDescription = document.createElement("p");
        sectionDescription.textContent = value.description || "";
        sectionDescription.style.color = "#234029";
        sectionDescription.style.fontSize = "13px";
        sectionDescription.style.margin = "0 0 12px";
        sectionDescription.style.lineHeight = "1.4";

        sectionBox.appendChild(deleteBtn);
        sectionBox.appendChild(sectionTitle);
        sectionBox.appendChild(sectionDescription);
        
        // Add fillable fields if they exist
        if (value.fields && Array.isArray(value.fields)) {
            value.fields.forEach((field, index) => {
                const fieldLabel = document.createElement("label");
                fieldLabel.textContent = field.label;
                fieldLabel.style.display = "block";
                fieldLabel.style.color = "#234029";
                fieldLabel.style.fontSize = "13px";
                fieldLabel.style.fontWeight = "600";
                fieldLabel.style.marginTop = index === 0 ? "0" : "12px";
                fieldLabel.style.marginBottom = "6px";
                
                const fieldInput = document.createElement("textarea");
                fieldInput.placeholder = field.placeholder || "";
                fieldInput.value = field.value || "";
                fieldInput.rows = 2;
                fieldInput.style.width = "100%";
                fieldInput.style.padding = "10px";
                fieldInput.style.border = "1px solid #c6e5cd";
                fieldInput.style.borderRadius = "8px";
                fieldInput.style.fontSize = "13px";
                fieldInput.style.boxSizing = "border-box";
                fieldInput.style.fontFamily = "inherit";
                fieldInput.style.resize = "vertical";
                
                // Save field value on input
                fieldInput.addEventListener("input", (e) => {
                    field.value = e.target.value;
                });
                
                sectionBox.appendChild(fieldLabel);
                sectionBox.appendChild(fieldInput);
            });
        }
        
        container.appendChild(sectionBox);
    });
    
    // Show suggested sections that are not added
    const suggestedContainer = document.createElement("div");
    suggestedContainer.style.marginTop = "20px";
    
    const suggestedTitle = document.createElement("h3");
    suggestedTitle.innerHTML = '<img src="./img/bulb.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px; filter: brightness(0) invert(1);"> Suggested Sections';
    suggestedTitle.style.color = "white";
    suggestedTitle.style.fontSize = "16px";
    suggestedTitle.style.fontWeight = "800";
    suggestedTitle.style.marginBottom = "20px";
    suggestedTitle.style.textAlign = "center";
    
    const suggestedSections = Object.keys(templateSections).filter(title => !sections[title]);
    
    if (suggestedSections.length > 0) {
        suggestedContainer.appendChild(suggestedTitle);
        
        suggestedSections.forEach(title => {
            const value = templateSections[title];
            
            const suggestionBox = document.createElement("div");
            suggestionBox.style.background = "#f9fff8";
            suggestionBox.style.borderRadius = "16px";
            suggestionBox.style.padding = "14px";
            suggestionBox.style.marginBottom = "10px";
            suggestionBox.style.border = "2px dashed #c6e5cd";
            suggestionBox.style.cursor = "pointer";
            suggestionBox.style.transition = "all 0.2s ease";
            
            suggestionBox.addEventListener('mouseenter', () => {
                suggestionBox.style.borderColor = "#6fa573";
                suggestionBox.style.background = "#ffffff";
            });
            
            suggestionBox.addEventListener('mouseleave', () => {
                suggestionBox.style.borderColor = "#c6e5cd";
                suggestionBox.style.background = "#f9fff8";
            });
            
            const suggestionTitle = document.createElement("h4");
            suggestionTitle.innerHTML = '<img src="./img/plus.png" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"> ' + title;
            suggestionTitle.style.color = "#315935";
            suggestionTitle.style.fontSize = "14px";
            suggestionTitle.style.fontWeight = "700";
            suggestionTitle.style.margin = "0 0 6px";
            
            const suggestionDesc = document.createElement("p");
            suggestionDesc.textContent = value.description;
            suggestionDesc.style.color = "#234029";
            suggestionDesc.style.fontSize = "13px";
            suggestionDesc.style.margin = "0";
            suggestionDesc.style.lineHeight = "1.4";
            
            suggestionBox.appendChild(suggestionTitle);
            suggestionBox.appendChild(suggestionDesc);
            
            suggestionBox.addEventListener('click', () => {
                // Copy template fields so each section has its own fields
                const fieldsCopy = value.fields ? value.fields.map(f => ({ ...f })) : [];
                sections[title] = { 
                    description: value.description,
                    fields: fieldsCopy
                };
                showEditSections();
            });
            
            suggestedContainer.appendChild(suggestionBox);
        });
    }
    
    container.appendChild(suggestedContainer);
    
    // Add input fields for custom section
    const customSectionTitle = document.createElement("h3");
    customSectionTitle.innerHTML = '<img src="./img/edit.png" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 8px; filter: brightness(0) invert(1);"> Create Custom Section';
    customSectionTitle.style.color = "white";
    customSectionTitle.style.fontSize = "16px";
    customSectionTitle.style.fontWeight = "800";
    customSectionTitle.style.marginTop = "20px";
    customSectionTitle.style.marginBottom = "12px";
    customSectionTitle.style.textAlign = "center";
    container.appendChild(customSectionTitle);
    
    const inputSection = document.createElement("div");
    inputSection.style.background = "#ffffff";
    inputSection.style.borderRadius = "20px";
    inputSection.style.padding = "16px";
    inputSection.style.marginTop = "10px";
    inputSection.style.boxShadow = "0 6px 14px rgba(0, 0, 0, 0.1)";
    inputSection.style.border = "2px solid #c6e5cd";
    
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.placeholder = "Section Title";
    titleInput.classList.add("agreement-Input");
    titleInput.id = "new-section-title-input";
    
    const descInput = document.createElement("textarea");
    descInput.placeholder = "Section Description";
    descInput.classList.add("agreement-Input");
    descInput.id = "new-section-description-input";
    descInput.rows = 3;
    
    const addBtn = document.createElement("button");
    addBtn.textContent = "Add This Section";
    addBtn.classList.add("btn", "btn-edit");
    addBtn.style.width = "100%";
    addBtn.addEventListener("click", () => {
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        
        if (!title || !description) {
            showCustomAlert("Please enter both title and description!");
            return;
        }
        
        // Custom sections can have simple fields too
        sections[title] = { 
            description,
            fields: [
                { label: "Details", placeholder: "Enter details here..." }
            ]
        };
        showEditSections();
    });
    
    inputSection.appendChild(titleInput);
    inputSection.appendChild(descInput);
    inputSection.appendChild(addBtn);
    container.appendChild(inputSection);
}

// Initialize agreement button
async function initAgreementButton() {
    console.log('initAgreementButton called');
    const btnHouseholdAgreement = document.getElementById("btn-household-agreement");
    console.log('btnHouseholdAgreement element:', btnHouseholdAgreement);
    
    if (!btnHouseholdAgreement) {
        console.warn('btn-household-agreement not found!');
        return;
    }
    
    btnHouseholdAgreement.addEventListener("click", async () => {
        console.log('Roommate Agreement button clicked!');
        
        try {
            const user = auth.currentUser;
            console.log('Current user:', user?.email);
            
            if (!user) {
                showCustomAlert("Please log in first!");
                return;
            }

            // Get user's household
            const userDocRef = doc(db, "ProfileUsers", user.uid);
            const userSnap = await getDoc(userDocRef);
            console.log('User doc exists:', userSnap.exists());
            
            if (!userSnap.exists()) {
                showCustomAlert("User profile not found!");
                return;
            }

            const userData = userSnap.data();
            const householdId = userData.group_id;
            console.log('Household ID:', householdId);
            
            if (!householdId) {
                showCustomAlert("You need to join or create a household first!");
                return;
            }

            //household details
            const householdRef = doc(db, "Households", householdId);
            const householdSnap = await getDoc(householdRef);
            console.log('Household doc exists:', householdSnap.exists());
            
            if (!householdSnap.exists()) {
                showCustomAlert("Household not found!");
                return;
            }

            const householdData = householdSnap.data();
            currentHouseholdId = householdId;
            currentHouseholdAdminEmail = householdData.adminEmail;
            console.log('Admin email:', currentHouseholdAdminEmail);

          
            const agreementResult = await getAgreement(householdId);
            console.log('Agreement result:', agreementResult);
            
         
            Object.keys(sections).forEach(key => delete sections[key]);
            
            if(agreementResult.success && agreementResult.agreement && agreementResult.agreement.sections) {
                Object.assign(sections, agreementResult.agreement.sections);
                console.log('Loaded sections:', Object.keys(sections));
            } else {
                console.log('No existing agreement found');
            }
            console.log('About to show agreement view');
            showAgreementView("roommateAgreement");
            showAgreementSections();
        } catch (error) {
            console.error('Error in roommate agreement button handler:', error);
            showCustomAlert('An error occurred: ' + error.message);
        }
    });
    
    console.log('Agreement button listener registered');
}

//Create/Edit Agreement Btn
document.addEventListener("DOMContentLoaded", () => {
    console.log('roommateAgreement DOMContentLoaded fired');
    
    const btnCreateAgreement = document.getElementById("btn-create-agreement");
    if (btnCreateAgreement) {
        console.log('btn-create-agreement found');
        btnCreateAgreement.addEventListener("click", () => {
            console.log('Create/Edit Agreement button clicked');
            const user = auth.currentUser;
            if (!user) {
                showCustomAlert("Please log in first!");
                return;
            }

            //check if user is admn
            if(user.email.toLowerCase() !== currentHouseholdAdminEmail?.toLowerCase()) {
                showCustomAlert("Only the household admin can edit the agreement. Please discuss changes with your admin!");
                return;
            }

            showAgreementView("createRoommateAgreement");
            showEditSections();   
        });
    } else {
        console.warn('btn-create-agreement not found');
    }

    
    const btnSaveAgreement = document.getElementById("btn-save-agreement");
    if (btnSaveAgreement) {
        console.log('btn-save-agreement found');
        btnSaveAgreement.addEventListener("click", async () => {
            console.log('Save Agreement button clicked');
            
            if (Object.keys(sections).length === 0) {
                showCustomAlert("Please add at least one section before saving!");
                return;
            }

            if(!currentHouseholdId) {
                showCustomAlert("No household selected.");
                return;
            }
            try {
                const result = await createOrUpdateAgreement(currentHouseholdId, sections);
                console.log('Save result:', result);

                if(result.success) {
                    showCustomAlert("Agreement saved successfully!");
                    showAgreementView("roommateAgreement");
                    showAgreementSections();
                }else{
                    showCustomAlert("Could not save agreement: " + (result.message || "Unknown error"));
                }
            } catch (error) {
                console.error("Error saving agreement:", error);
                showCustomAlert("Failed to save agreement.");
            }
        });
    } else {
        console.warn('btn-save-agreement not found');
    }

  
    const btnBackFromAgreement = document.getElementById("btn-back-from-agreement");
    if (btnBackFromAgreement) {
        console.log('btn-back-from-agreement found');
        btnBackFromAgreement.addEventListener("click", () => {
            console.log('Back button clicked from agreement view');

            if (window.show){
                window.show('dash');
            }
        });
    }


    const btnCancelAgreement = document.getElementById("btn-cancel-agreement");
    if (btnCancelAgreement) {
        console.log('btn-cancel-agreement found');
        btnCancelAgreement.addEventListener("click", () => {
            console.log('Cancel button clicked from edit view');
            showAgreementView("roommateAgreement");
            showAgreementSections();
        });
    }

    

    console.log('Calling initAgreementButton from DOMContentLoaded');
    initAgreementButton();
    console.log('roommateAgreement.js DOMContentLoaded complete');
});

window.initAgreementButton = initAgreementButton;
console.log('roommateAgreement.js loaded completely');
