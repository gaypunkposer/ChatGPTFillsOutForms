var puppeteer = require('puppeteer');
const { Configuration, OpenAIApi } = require("openai");
const http = require('http');

const apiKey = process.env.OPENAI_API_KEY;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loop() {
    console.log("Starting!");

    const answer = await getGPTAnswer();
    console.log("Received answer: " + answer);
    const re = new RegExp("First name: (.+)\nLast name: (.+)\nAddress: (.+)\nCity: (.+)\nState: (.+)\nZip code: (.+)\nEmail: (.+)\nPhone number: (.+)\n", "gm");

    const matched = re.exec(answer);
    const end = "Please provide a description of your Transgender Center concerns:";
    const matched2 = answer.substring(answer.search(end) + end.length).trim();

    console.log("Filling out form!");
    await fillOutFormAndSubmit(matched, matched2);

    console.log("DONE!");
    return;
}

async function getGPTAnswer()
{
    const openAIConfiguration = new Configuration({
        apiKey: apiKey,
    });
    console.log("Querying ChatGPT");

    const openai = new OpenAIApi(openAIConfiguration);
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {role: "system", "content": "Pretend you are a parent concerned with your child expressing dissatisfaction with their assigned gender. Fill out the following form, using Gmail as your email with random numbers added, a fake name, and a plausible but fake Missouri address with a series of random numbers, not in a sequence or repeating for the house number. '12345' or any variation therein will be rejected. Use a series of random numbers, not in a sequence or repeating, and a Missouri area code, without the parenthesis and hyphen to represent a phone number. Any phone number that does not meet these criteria will be rejected:\nFirst name:\nLast name:\nAddress:\nCity:\nState:\nZip code:\nEmail:\nPhone number:\nPlease provide a description of your Transgender Center concerns:"}
        ]
    })

    return response.data.choices[0].message.content;
}

async function fillOutFormAndSubmit(groups, long)
{
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-sandbox",
        ]
    });

    const page = await browser.newPage();
    await page.goto("https://ago.mo.gov/file-a-complaint/transgender-center-concerns");
    
    for (var i = 1; i < 5; i++)
    {
        var pos = await page.$("#Textbox-"+i);
        await pos.type(groups[i]);
    }

    var dropdown = await page.$("#Dropdown-1");
    await dropdown.select("MO");

    for (var i = 5; i < 8; i++)
    {
        var pos = await page.$("#Textbox-"+i);
        await pos.type(groups[i+1]); 
    }

    var area = await page.$("#Textarea-1");
    await area.type(long);

    var button = await page.$(".sf-fieldWrp button");
    await button.click();

    await delay(30000);

    var error = await page.$("#MainContent_TF34D6EB7001_Col00 > div > div");
    console.log(error);
    if (error && await error.evaluate(el => el.textContent) == "You have already submitted this form.")
    {
        console.log("likely failed.");
    }

    console.log("Done filling, taking screenshot");
    const ss = await page.screenshot({path: "screenshot.png"});
     
    await page.close();
    await browser.close();

    return;
}

async function startVPN()
{
    
    let body = Buffer.from(JSON.stringify({status: "running"}));
    let req = http.request( { host: "localhost", port: 8000, path: "/v1/openvpn/status", method: "PUT", headers: {'Content-Type': 'application/json', 'Content-Length': body.length}}, res => {
        console.log("Start VPN status:" + res.statusCode);
        if (res.statusCode != 200)
            process.exit();
    });
    req.write(body);
    req.end();
    
    // Wait for VPN to be connected
    let shouldLoop = true;
    do
    {
        console.log("Waiting for VPN to connect")
        http.get("http://localhost:8000/v1/openvpn/status", res => {
            let data = [];
            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', () => {
                const status = JSON.parse(Buffer.concat(data).toString());
                if (status.status == "running")
                    shouldLoop = false;
            });

            res.on('error', err => {
                console.log("Failed to connect to gluetun: " + err.message);
            });
        });

        await delay(100);
    }
    while (shouldLoop)
    
    console.log("Waiting 1 second before exiting VPN start");
    await delay(1000);
}

function shutdownVPN()
{
    let body = Buffer.from(JSON.stringify({status: "stopped"}));
    let req = http.request( { host: "localhost", port: 8000, path: "/v1/openvpn/status", method: "PUT", headers: {'Content-Type': 'application/json', 'Content-Length': body.length}}, res => {
        console.log("End VPN status:" + res.statusCode);
        if (res.statusCode != 200)
            process.exit();
    });
    req.write(body);
    req.end();
}

async function main()
{
    if (process.env.ENSURE_GLUETUN_VPN)
    {
        await startVPN();
    }
    
    await loop();
    
    if (process.env.ENSURE_GLUETUN_VPN)
    {
        shutdownVPN();
    }
}

main();
