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
* 
