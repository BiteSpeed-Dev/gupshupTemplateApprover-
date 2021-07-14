# Gupshup Tempalte Approver

This code is written with puppeteer to automate template approval process on gupshup.

</br>


## Requirements:
* node and npm

</br>

## Install Project:
Run this command in project directory:
```
npm install
```

</br>

## Usages:
* create a .env file at root level wit h content as:
```
GUPSHUP_USERNAME="*****"
GUPSHUP_PASSWORD="*****"
GUPSHUP_TEMPLATE_PASSWORD="*****"
HEADLESS=true 
SLOW_MO=0
```
* Run `node index` to start program

</br>

## NOTES:
* There is a file called `data.xlsx` which consist all the data templates to be uploaded. Edit it to change template content and `strictly follow same format`.
* Edit `HEADLESS` in .env file to start (`HEADLESS=false`) automated chrome process or to hide it (`HEADLESS=true`).
* Edit `SLOW_MO` in .env file to see see chrome automation in slow motion e.g. `SLOW_MO=30`
* Once automation process complete you can check all failed cases(if any) in `failed.json` file and then you can try them again.
* Whenever any template is submitted we take a screenshot of end screen, so you can check what was the last response. You can check these screenshot in `screenshots` folder and every template screenshot is mapped as `template{no.}.png` where `no.` is index of template. 
