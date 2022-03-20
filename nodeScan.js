const SerialPort = require('serialport');
const ModbusRTU = require("modbus-serial");
const { connect } = require('http2');

const timer = ms => new Promise(res => setTimeout(res, ms))

var found = [];

async function main() {
    var ports = await SerialPort.list();
    
    var argv = require('minimist')(process.argv.slice(2));

    console.log(argv)
    const timeOut = argv?.t || 200;
    const numOfNodes = argv?.n || 8;
    const brs = argv?.b?.split(',')?.map((b) => parseInt(b)) || [9600, 19200, 38400];
    const prs = argv?.p?.split(',') || ['none', 'even', 'odd'];

    
    var port  = argv.c || 'COM16';
    
    console.log(timeOut, numOfNodes, brs, prs, port);
    
    console.log(ports.map((p) => p.path))

    var client = new ModbusRTU();
    for (let br of brs) {
        for(let pr of prs) {
            if(client.isOpen) client.close();
            client = new ModbusRTU();
            try {                
                var connected = false;
                while(!connected || !client.isOpen) {
                    try {
                        await client.connectRTUBuffered(port, {baudRate: br, parity: pr})            
                    } catch(e) {
                        console.log(e)
                    }
                    finally {
                        connected = true;
                    }
                }

                // await timer(100);
                await client.setTimeout(timeOut)
                console.log(br, pr)

                for(let i = 1; i <= numOfNodes; i++) {
                    var notOpen = false;
                    while(!notOpen) {
                        try {
                            await client.setID(i);
                            await timer(100);
                            
                            var readings = await client.readInputRegisters(0, 1);                            
                            readings = readings.data;   
                            console.log(i, readings)                                
                            found.push({node: i, baud: br, parity: pr, reading: readings});
                            notOpen = true;
                        } catch(e) {
                            console.log(i, e.message)      
                            if(e.message.includes('Open')) {
                                notOpen = false;    
                                console.log('retrying')
                                await client.connectRTUBuffered(port, {baudRate: br, parity: pr})    
                                await timer(100);        
                            }
                            else notOpen = true;                  
                        }
                    }
                }
            

                
            } catch(e) {console.log(e)}
        }
    }    

    await client.setTimeout(400);
    console.log(found)

}

main();