/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 */

//==============================================================================
// Welcome to scripting in Spark AR Studio! Helpful links:
//
// Scripting Basics - https://fb.me/spark-scripting-basics
// Reactive Programming - https://fb.me/spark-reactive-programming
// Scripting Object Reference - https://fb.me/spark-scripting-reference
// Changelogs - https://fb.me/spark-changelog
//
// Spark AR Studio extension for VS Code - https://fb.me/spark-vscode-plugin
//
// For projects created with v87 onwards, JavaScript is always executed in strict mode.
//==============================================================================

// How to load in modules
const Scene = require('Scene');
const Materials = require('Materials');

const TouchGestures = require('TouchGestures');
const Reactive = require('Reactive');
const Time = require('Time');

const Random = require('Random');
var ReactiveModule = require('Reactive');

const Blocks = require('Blocks');
const Patches= require('Patches');

const DeviceMotion = require('DeviceMotion');

// const Math=require('Math');


// Use export keyword to make a symbol available in scripting debug console
export const Diagnostics = require('Diagnostics');

var delayed=false;
var count=0;

// const DISAPPEAR_TIME=3000;
// const GENERATE_TIME=200;

// const BLOCK_LIMIT=100;
// const DAMP_DIST=0.01;

const DAMP_VEL=.001;

var last_position=Reactive.pack3(0,0,0);



// To use variables and functions across files, use export/import keyword
// export const animationDuration = 10;

// Use import keyword to import a symbol from another file
// import { animationDuration } from './script.js'

(async function () {  // Enables async/await in JS [part 1]

    // Diagnostics.log("run!");
    // To access scene objects
    const [fd, material, container,text2d, camera,planeTracker] = await Promise.all([
        Scene.root.findFirst('Focal Distance'),
        Materials.findFirst('material_object'),
        Scene.root.findFirst('object_container'),
        Scene.root.findFirst('2dText0'),
        Scene.root.findFirst('Camera'),
        Scene.root.findFirst('planeTracker0'),
    ]);


    const GENERATE_TIME = await Patches.outputs.getScalar('GenerateTime');
    const DISAPPEAR_TIME = await Patches.outputs.getScalar('DisappearTime');

    const BLOCK_LIMIT = await Patches.outputs.getScalar('BlockLimitCount');
    const DAMP_DIST = await Patches.outputs.getScalar('BlockDampDistance');

    const globalPosition = await Patches.outputs.getVector('globalPosition');

    const deviceMotionTransform = DeviceMotion.worldTransform;

    const worldPlaneTransform = planeTracker.worldTransform.inverse();


    // const myString = await Patches.outputs.getString('myString');


    // Diagnostics.log(myString.pinLastValue());

    async function addBlock(){

        // Diagnostics.log('add block!');

        const children=await container.findByPath("*");
        // Diagnostics.log(children.length);
        if(children.length >= BLOCK_LIMIT.pinLastValue()){


            for(var i=0;i< children.length- BLOCK_LIMIT; ++i){
                // Diagnostics.log('remove!');
                await container.removeChild(children[i]);
            }
        }

         // Diagnostics.log(children.length);

       Blocks.instantiate('block0',{}).then(async function(block) {


            
            var pos=fd.worldTransform.position;
            // pos.add(Reactive.pack3(0,.2*count,.2*count));
            // count++;
            // if(Reactive.magnitude(pos).pinLastValue()!=0){
            
            var r=DAMP_DIST.pinLastValue();

            var deltax=Reactive.sin(Time.ms.mul(DAMP_VEL)).mul(r).pinLastValue();
            var deltay=Reactive.cos(Time.ms.mul(DAMP_VEL)).mul(r).pinLastValue();


            var new_pos=pos.add(Reactive.pack3(deltay,deltax,0)).pinLastValue();


            // block.transform.rotation=fd.worldTransform.rotation;//lookAt(cameraPositionSignal);

            block.transform.position=new_pos;

            // block.transform.rotationX = deviceMotionTransform.rotationX;
            // block.transform.rotationY = deviceMotionTransform.rotationY;
            // block.transform.rotationZ = deviceMotionTransform.rotationZ;

            block.transform.rotation=worldPlaneTransform.lookAt(camera.worldTransform.position).rotation;

            // Diagnostics.log(new_pos.z.pinLastValue());

            // var angle=Reactive.atan2(new_pos.x.sub(last_position.x).pinLastValue(),
            //                          new_pos.y.sub(last_position.y).pinLastValue());
            
            // Diagnostics.log(`${block.transform.position.x.pinLastValue()},${block.transform.position.y.pinLastValue()}`);
            // Diagnostics.log(last_position.pinLastValue());
            // Diagnostics.log(angle.mul(180.0/Math.PI).pinLastValue()+90);


            // block.transform.rotation=fd.worldTransform.rotation;//.pinLastValue();
            // block.transform.rotation=Reactive.quaternionFromEuler(0,0,Reactive.val(Random.random()));
            // block.transform.rotation=Reactive.quaternionFromEuler(0,0,angle.mul(1).pinLastValue()+Math.PI*.5);

            // var world=fd.worldTransform.rotation.eulerAngles.pinLastValue();
            // var deltaa=angle.add(Math.PI*.5).pinLastValue();

            // block.transform.rotation=Reactive.quaternionFromEuler(0,0,deltaa);

            block.material=material;

            await container.addChild(block);
            block.inputs.setBoolean('visible',true);
            

            Time.setTimeout(function(){
                Scene.destroy(block);
            },DISAPPEAR_TIME.pinLastValue());

            
            // last_position=pos.pinLastValue();


        });  
    }

    // const cameraPositionSignal=worldPlaneTransform.inverse().applyToPoint(fd.worldTransform.position);
    // container.transform.position=cameraPositionSignal;
    container.transform=worldPlaneTransform;


    const intervalTimer =Time.setInterval(function(){
        addBlock();
    }, GENERATE_TIME.pinLastValue());    
   

    DISAPPEAR_TIME.monitor().subscribe((val)=>{
        Diagnostics.log(val);

        Time.clearInterval(intervalTimer);



        intervalTimer =Time.setInterval(function(){
            addBlock();
        }, GENERATE_TIME.pinLastValue());  
    });


    // const [plane] = await Promise.all([
    //     Scene.root.findFirst('plane0')
    // ]);

    // Store a reference to the transform of the plane and the world transform of
    // the DeviceMotion module
    // const planeTransform = plane.transform;
    // const deviceWorldTransform = DeviceMotion.worldTransform;

    // Bind the rotation of the device to the plane
    // planeTransform.rotationX = deviceWorldTransform.rotationX;
    // planeTransform.rotationY = deviceWorldTransform.rotationY;
    // planeTransform.rotationZ = deviceWorldTransform.rotationZ;

    // plane.position=deviceWorldTransform.position.mul(-1);


    // const cameraTransform=planeTracker.transform;
    
    Diagnostics.watch("TransformX", worldPlaneTransform.position.x);
    Diagnostics.watch("TransformY", worldPlaneTransform.position.y);
    Diagnostics.watch("TransformZ", worldPlaneTransform.position.z);
    // Diagnostics.watch("TransformZ", deviceWorldTransform.rotationX);



    // text2d.text=deviceWorldTransform.position.x.format("{:.2f}").concat(' , ')
    //             .concat(deviceWorldTransform.position.y.format("{:.2f}")).concat(' , ')
    //             .concat(deviceWorldTransform.position.z.toString());

    text2d.text=worldPlaneTransform.position.x.format("{:.2f}").concat(' , ')
                .concat(worldPlaneTransform.position.y.format("{:.2f}")).concat(' , ')
                .concat(worldPlaneTransform.position.z.toString());



})(); // Enables async/await in JS [part 2]
