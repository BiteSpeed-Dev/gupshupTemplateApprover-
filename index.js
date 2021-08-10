const puppeteer = require("puppeteer");
require('dotenv').config();
const reader = require('xlsx');
const fs = require('fs');


//PARSE EXCEL FILE FOR TEMPLATE DATA IN OBJECT ARRAY
const file = reader.readFile('./data.xlsx')  
let templateArray = [], failedCases = [];
const sheets = file.SheetNames;
for(let i = 0; i < sheets.length; i++)
{
   const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
   temp.forEach((res) => {templateArray.push(res)});
}


//AUTOMATE TEMPLATE CREATION PROCESS
(async()=>{

    console.log(`
    /*********************************************************************************/\n 
     PLEASE USE FAST SPEED INTERNET THIS PROCESS MIGHT MISBEHAVE DUE TO INTERNET SPEED 
    /*********************************************************************************/\n
    `)

    const username = process.env.GUPSHUP_USERNAME;
    const password = process.env.GUPSHUP_PASSWORD;
    const templatePassword = process.env.GUPSHUP_TEMPLATE_PASSWORD;
    const headless = process.env.HEADLESS;
    const slowMo = process.env.SLOW_MO;


    const browser = await puppeteer.launch({ headless: JSON.parse(headless), slowMo: JSON.parse(slowMo) });
    const page = await browser.newPage();

    try {

        //STEP 1: setup webpage
        await page.goto("https://unify.smsgupshup.com/WhatsApp/Analytics/");
        await page.setViewport({ width: 1920, height: 1080 });
        await page.waitForSelector('#submit_field', {visible: true});

        console.log("* Gupshup Login page Loaded");

        //STEP 2: Enter credentials
        await addInput(page, 'input[name="username"]', username);
        await addInput(page, 'input[name="password"]', password);

        //STEP 3: Click Login wait for login navigation:
        //There is an alternative way to get this button by iterating over complete element set and looking for "Login"
        await clickAndWait(page, 'div[class="ui submit blue button"]', '#welcome_note', null)

        console.log("* Successfully Logged In and navigating to template page");

        //click on side bar and wait for 500 milliseconds
        await clickAndWait(page, 'a[id="sidebar_trigger"]', null, 500);//sliding side bar is not an network call so we can just wait for animation

        //STEP 4: click to template creation page link and wait for it
        await clickAndWait(page, 
            'a[href="/WhatsApp/Analytics/views/message_template/create"]', 
            '#create_template_form', null);
        
        console.log("* Template creation page loaded, creating template one by one");


        //STEP 5: Iterate over template raw data and fill form
        await templateFormLoop(page, templatePassword, templateArray);

        //STEP 6: show and save failed cases
        if(failedCases.length>0){
            writeTofile('./failed.json', failedCases);   
        }

        console.log(`\n\n/*******************************************\n
        DONE with ${failedCases.length} failed cases out of ${templateArray.length}, 
        checkout failed.json and ./screenshots for more details ***/\n`);

        await browser.close();   
    
    } catch (err) {
        console.log("## ERROR ## : ", err.message, "\n");
        console.error(err); 
    }
})();


async function templateFormLoop(page, templatePassword, templateArr){

    //templateArr.length
    for (let index = 1; index < 2; index++) {
        const template = templateArr[index];    

        try {
        
            //STEP 5.N: FILL TEMPLATES INPUTS
            //password
            try {
                await addInput(page, 'input[name="password"]', templatePassword);
            } catch (e) {}
            //template name//template["Template Name"]
            await addInput(page, 'input[name="template_name"]', template["Template Name"]);
            //category
            await clickAndWait(page, 
                `input[value=${getTemplateCategory(template['Category'])}]`, null, 10);
            //type
            let msgType = getMsgType((template['Type']).trim()); 
            await page.select('#type_dropdown', getMsgType((template['Type']).trim()));
            if(msgType == 'MEDIA'){
                await clickAndWait(page, `input[name="media_types"][value="image"]`, null, 10);
            }
            
            //language
            await page.evaluate(() => {
                document.querySelector('input[class="search"]').click();
                document.querySelector('div[data-value="en"]').click();// ** THIS WILL ALWAYS SELECT ENGLISH ONLY **
            });
            //body/template
            await addInput(page, 'textarea[name="template_message"]', template['Template']);    
            
            
            //button
            let buttonType = getButtonType(template['Button Type']);
            await page.select('#button_dropdown', buttonType);

            if(buttonType == 'QUICK_REPLY'){
                await addMultipleButton(page, template);
            }else if(buttonType == 'CALL_TO_ACTION'){
                //select action
                await page.select(
                    '.call_to_action_type_dropdown', 
                    getButtonAction(template['Button Type']));
                //add button text
                await addInput(page, 
                    `input[class="${getButtonTextElementId(template['Button Type'])}"]`, 
                    template['Button1']);    
                //select dynamic link
                await page.select('#url_type_dropdown', 'DYNAMIC');    
                //add website
                await addInput(page, 'input[id="website_url"]', 'https://bspd.me/');// ** HARDCODED DYNAMIC WEBSITE **
            }

            //ADD SAMPLES
            await addSamples(page, template);

            console.log(`* Submitting template no. ${index + 1}`);
            //Click create button
            await clickAndWait(page, 'button[id="create_template_submit"]', null, 5500);

            //Template is successfully created if it contains substring of:
            /**
             * Excellent🤘
             * Your Message Template📩 has been created successfully🙏.
             * You can now test🧪 this template once it gets approved✔️
             */
            let successfullyCreated = await page.evaluate(() => {
                let exist = document.body.innerHTML.search("has been created successfully");
                return (exist != -1);
            });

            //take snap of last screen
            await page.screenshot({ path: `./screenshots/template${index + 1}.png` });

            //handle success and failed cases
            if(!successfullyCreated){
                failedCases.push(template);
                console.log(`* Template no. ${index + 1} is failed`);
            }else{
                console.log(`* Template no. ${index + 1} is created successfully`);    
            }
            //reload page for next template (if any)
            await page.reload({ waitUntil: ["load"] });
        } catch (loopErr) {
            failedCases.push(template);
            console.log("## ERROR INSIDE TEMPLATE LOOP: ", loopErr.message);
            console.log(`* Template no. ${index + 1} is failed`);
        }
    }
}

async function addSamples(page, template){
    
    await clickAndWait(page, `button[id=add_sample]`, '#add_sample_grid', 1000);

    
    //let inputCount = (await page.$$('input[class="template_variable_examples_input"]')).length;
    for (let i = 0; i < 6; i++) {
        if(template['Template'].indexOf(`{{${i+1}}}`) != -1){
            await addInput(page, `input[name="{{${i+1}}}"]`, template[`{{${i+1}}}`]);    
        }
    }

    // await page.evaluate(() => {
    //     let sampleInputArr = document.querySelectorAll('.template_variable_examples_input');
    //     sampleInputArr.forEach(input => {
    //         input.value = "test text: ab@12_ a:`+%";
    //     });
    // });

    let buttonExist = await page.$('input[name="button_examples"]');
    if(buttonExist){
        await addInput(page, 'input[name="button_examples"]', 'https://bspd.me/');
    }

    //let uploadExist = await checkIfElementExist(page, 'input[id=add_media_file_handle_button]');
    let uploadExist = await page.$('input[id=add_media_file_handle_button]');
    if(uploadExist){
        const elementHandle = await page.$('input[id=add_media_file_handle_button]');
        await elementHandle.uploadFile('./defaultImage.jpeg');
    }

    await clickAndWait(page, `button[class=wa-modal_actions__main]`, null, 500);
}

//FUNCTION TO FOCUS AND ADD TEXT TO INPUT FIELDS
async function addInput(page, elementSelector, data){
    await page.focus(elementSelector);
    await page.keyboard.type(data);
}


//FUNCTION TO CLICK AND WAIT
async function clickAndWait(page, elementSelector, waitFor, waitTill){
    await page.click(elementSelector);
    
    if(waitFor){
        await page.waitForSelector(waitFor, {visible: true});
    }

    if(waitTill){
        await page.waitForTimeout(waitTill);
    }
}

//FUNCTION TO ADD MULTIPLE BUTTONS
async function addMultipleButton(page, template){
    let endButton = 1, buttonArray = [];
    while(endButton != -1){
        let currentButton = template[`Button${endButton}`];
        if(currentButton){
            buttonArray.push(currentButton);
            if(endButton>1){
                await clickAndWait(page, 'div[id="add_button_trigger"]', null, 500);
            }
            endButton++;
        }else{
            endButton = -1;
        }
    }

    let buttonTypeSelector = getButtonTextElementId(template['Button Type']);
    await page.evaluate((buttonArray, buttonTypeSelector) => {
        const inputs = [...document.querySelectorAll(`input[class=${buttonTypeSelector}]`)];
        let count = 0;
        inputs.forEach(input => {
            input.value = buttonArray[count];
            count++;
        });
    }, buttonArray, buttonTypeSelector);
}


function getTemplateCategory(value){
    let elementTag;
    switch (value) {
        case 'Payment Update':
            elementTag = 'PAYMENT_UPDATE' 
            break;
        case 'Appointment Update':
            elementTag = 'APPOINTMENT_UPDATE' 
            break;
        case 'Shipping Update':
            elementTag = 'SHIPPING_UPDATE' 
            break;
        case 'Personal Finance Update':
            elementTag = 'PERSONAL_FINANCE_UPDATE' 
            break;
        case 'Issue Resolution':
            elementTag = 'ISSUE_RESOLUTION' 
            break;
        case 'Alert Update':
            elementTag = 'ALERT_UPDATE' 
            break;
        case 'Transportation Update':
            elementTag = 'TRANSPORTATION_UPDATE' 
            break;
        case 'Reservation Update':
            elementTag = 'RESERVATION_UPDATE' 
            break;
        case 'Auto Reply':
            elementTag = 'AUTO_REPLY' 
            break;
        case 'Ticket Update':
            elementTag = 'TICKET_UPDATE' 
            break;
        case 'Account Update':
            elementTag = 'ACCOUNT_UPDATE' 
            break;                                       
        default:
            elementTag = 'PAYMENT_UPDATE' 
            break;
    }

    return elementTag;
}


function getMsgType(value){
    let elementTag;
    switch (value) {
        case 'TEXT':
            elementTag = 'TEXT' 
            break;
        case 'IMAGE':
            elementTag = 'MEDIA' 
            break;                                     
        default:
            elementTag = 'TEXT' 
            break;
    }

    return elementTag;
}

function getButtonType(value){
    let elementTag;
    switch (value) {
        case 'Call to Action- Visit Website':
            elementTag = 'CALL_TO_ACTION' 
            break;
        case 'Quick Reply':
            elementTag = 'QUICK_REPLY' 
            break;                                     
        default:
            elementTag = 'NONE' 
            break;
    }

    return elementTag;
}

function getButtonAction(value){
    
    let elementTag;
    if(value.includes(("Visit Website").toLowerCase())){
        elementTag = "url";
    }else if(value.includes(("Call Phone Number").toLowerCase())){
        elementTag = "phone_number";
    }else{
        elementTag = "url";//default case
    }

    return elementTag;
}

function getButtonTextElementId(value){
    
    let elementTag;
    if(value == 'Quick Reply'){
        elementTag = 'quick_reply_button_text';
    }else if(value.includes(("Call Phone Number").toLowerCase())){
        elementTag = "phone_number_button_text call_to_action_button_text";
    }else if(value.includes(("Visit Website").toLowerCase())){
        elementTag = "url_button_text call_to_action_button_text";
    }else{
        elementTag = "url_button_text call_to_action_button_text";//default case
    }

    return elementTag;
}

function writeTofile(path, content) {
    fs.writeFileSync(path, JSON.stringify(content));
}