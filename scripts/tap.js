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
    const MAX_DIST = await Patches.outputs.getScalar('MaxDistanceInBetween');

    const DAMP_DIST = await Patches.outputs.getScalar('BlockDampDistance');
    const DAMP_SIZE = await Patches.outputs.getScalar('BlockDampSize');


    const worldPlaneTransform = planeTracker.worldTransform.inverse();

    container.transform=worldPlaneTransform;


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
        const pos=fd.worldTransform.position;
        
        const dist=(last_position.magnitude().pinLastValue()<=0)?Reactive.val(0):pos.sub(last_position).magnitude();



        if(dist.gt(0).pinLastValue()){
            
            // Diagnostics.log(dist.pinLastValue());
            
            var p=(dist.div(MAX_DIST).ceil()).pinLastValue();

            for(var i=0; i<1.0; i+=1.0/p){


                const tmp_pos=last_position.mix(pos,i);
                // Diagnostics.log(i+", "+tmp_pos.pinLastValue().toString());

                Blocks.instantiate('block0',{}).then(async function(block) {

                    var r=DAMP_DIST.pinLastValue();

                    // var deltax=Reactive.sin(Time.ms.mul(DAMP_VEL)).mul(r).pinLastValue();
                    // var deltay=Reactive.cos(Time.ms.mul(DAMP_VEL)).mul(r).pinLastValue();
                    var deltax=(Random.random()*2.0-1.0)*r;
                    var deltay=deltax;


                    const new_pos=tmp_pos.add(Reactive.pack3(deltay,deltax,0));

                    try{
                        block.transform.position=new_pos.pinLastValue();


                        const trackedPlaneRotation = Reactive.quaternionFromEuler(
                            planeTracker.worldTransform.rotationX.sub(0),
                            planeTracker.worldTransform.rotationZ.neg(),
                            planeTracker.worldTransform.rotationY
                        );

                        const deviceRotation = Reactive.quaternionFromEuler(
                            DeviceMotion.worldTransform.rotationX,
                            DeviceMotion.worldTransform.rotationY,
                            DeviceMotion.worldTransform.rotationZ
                        );

                        // block.transform.rotation=planeTracker.worldTransform.rotation.conjugate().mul(DeviceMotion.worldTransform.rotation);
                        block.transform.rotation=trackedPlaneRotation.mul(deviceRotation);

                        var tmp_scale=Math.max(0,(Random.random())*DAMP_SIZE.pinLastValue()+1);
                        block.transform.scale=Reactive.pack3(tmp_scale,tmp_scale,tmp_scale);

                    }catch(error){
                        Diagnostics.log(error);
                    }


                    block.material=material;

                    await container.addChild(block);
                    block.inputs.setBoolean('visible',true);
                    

                    Time.setTimeout(function(){
                        Scene.destroy(block);
                    },DISAPPEAR_TIME.pinLastValue());

                    
                });  
            }
        }

        last_position=pos.pinLastValue();
    }

    // const cameraPositionSignal=worldPlaneTransform.inverse().applyToPoint(fd.worldTransform.position);
    // container.transform.position=cameraPositionSignal;
   

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


    
    // Diagnostics.watch("TransformX", pos.x);
    // Diagnostics.watch("TransformY", pos.y);
    // Diagnostics.watch("TransformZ", pos.z);

    //  Diagnostics.watch("LTransformX", last_position.x);
    // Diagnostics.watch("LTransformY", last_position.y);
    // Diagnostics.watch("LTransformZ", plast_positionos.z);
    // Diagnostics.watch("TransformZ", deviceWorldTransform.rotationX);


    // text2d.text=worldPlaneTransform.position.x.format("{:.2f}").concat(' , ')
    //             .concat(worldPlaneTransform.position.y.format("{:.2f}")).concat(' , ')
    //             .concat(worldPlaneTransform.position.z.toString());



})(); // Enables async/await in JS [part 2]
