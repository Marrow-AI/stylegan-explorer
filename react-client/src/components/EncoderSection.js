import React, { useState, useEffect, useRef } from "react";
import ImageUploading from 'react-images-uploading';
import store, { setMyEncodingFile } from '../state';
import { useSelector } from 'react-redux';
import useSpinner from './useSpinner';
import Tree from 'react-d3-tree';
import { hierarchy, tree as d3Tree } from "d3";
import { cloneDeep, uniqueId } from 'lodash';
import useDimensions from 'react-use-dimensions';

export default function EncoderSection(props) {
  const dataset = useSelector(state => state.dataset);
  const [loading, showLoading, hideLoading] = useSpinner();
  const ENDPOINT = useSelector(state => state.ENDPOINT);
  const [images, setImages] = useState([]);
  const currentStep = useSelector(state => state.currentStep);
  const currentShuffle = useSelector(state => state.currentShuffle);
  const snapshot = useSelector(state => state.snapshot);
  const maxSteps = useSelector(state => state.maxSteps);
  const animationSteps = useSelector(state => state.animationSteps);
  const serverState = useSelector(state => state.serverState);
  const [r, setR] = useState(35)
  const [click, setClick] = useState(false)
  const [margin, setMargin] = useState(-18);
  const [countNodes, setCountNodes] = useState(1);
  let targetRef = useRef();
  const [dimensions, setDimension] = useState({});
  const [tree, setTree] = useState({
    name: 'root',
    children: [],
    attributes: {
      uuid: "ROOT"
    },
  });

  const [currentParent, setCurrentParent] = useState("ROOT");

  const handleClick = () => {
    setClick(!click)
    if(click) {
      setR(55)
    }
    if(!click) {
      setR(35)
    }
  }

  const renderRectSvgNode = ({ nodeDatum, toggleNode }) => (
    <g>
      {nodeDatum.attributes?.image ? (
        <>
          <defs>
            <pattern id={`image-${nodeDatum.attributes.uuid}`} x="0" y="0" viewBox="0 0 1024 1024" height="100%" width="1">
              <image x="0" y="0" width="1024" height="1024" href={nodeDatum.attributes.image}></image>
            </pattern>
          </defs>
          <circle r={r} onClick={handleClick} fill={`url(#image-${nodeDatum.attributes.uuid}`} opacity='0.9' stroke='#3F51B5' />
        </>
      ) : (
        <>
          <circle r="5" fill='#000' stroke='transparent' onClick={handleClick} />
        </>
      )}

    </g>
  );

  const addLastChild = (data) => {
    const treeClone = cloneDeep(tree);
    const root = hierarchy(treeClone);
    const descendants = root.descendants();
    const lastChild = descendants[descendants.length - 1].data;
    lastChild.children = [
      ...lastChild.children,
      {
        name: data.name,
        attributes: {
          image: data.imageUrl,
          uuid: uniqueId()
        }, 
        children: [],
      }
    ]
    setCountNodes(countNodes + 1)
    console.log("Tree", treeClone);
    setTree(treeClone);
    return lastChild.uuid;
  }

  const addChild = (data, parentId) => {
    const treeClone = cloneDeep(tree);
    const root = hierarchy(treeClone);
    const parent = root.find((node) => node.data.attributes.uuid === parentId)
    const newId = uniqueId();
    parent.data.children = [
      ...parent.data.children,
      {
        name: data.name,
        attributes: {
          image: data.imageUrl,
          uuid: newId,
        }, 
        children: [],
      }
    ]
    setCountNodes(countNodes + 1)
    console.log("Tree", treeClone);
    setTree(treeClone);
    return newId;
  }

  const addBetween = (data) => {
    const treeClone = cloneDeep(tree);
    const root = hierarchy(treeClone);
    const descendants = root.descendants();
    const lastChild = descendants[descendants.length - 1];
    const parent = lastChild.parent;

    const between = {
      name: data.name,
      attributes: {
        image: data.imageUrl,
        uuid: uniqueId()
      }, 
      children: [ lastChild.data ],
    }
    // setCountNodes(countNodes + 1)
    parent.data.children = [between];
    console.log("Tree", treeClone);
    setTree(treeClone);
    return between.attributes.uuid;
  }

  const onSubmit = () => {
    const data = {
      dataset: dataset,
      steps: maxSteps,
      snapshot: snapshot,
      type: currentShuffle,
      currentStep: currentStep
    }
    fetch(ENDPOINT + '/shuffle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then((data) => {
        if (data.result === "OK") {
          return fetch(ENDPOINT + '/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
        } else {
          alert(data.result);
        }
      })
      .then(res => res.json())
      .then((data) => {
        console.log("Publish result", data);
        if (data.result === "OK") {
          showLoading();
          console.log("Server is publishing!");
        } else {
          alert(data.result);
        }
      })
  }

  const onChange = (imageList, addUpdateIndex) => {
    store.dispatch({
      type: 'SAVE_FILE_NAME',
      file_name: images
    })
    setImages(images => [...images, ...imageList]);
    fetch(ENDPOINT + '/encode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 
        JSON.stringify({
          data: imageList[0].data_url,
          fileName: imageList[0].file.name,
          steps: maxSteps,
          snapshot: snapshot,
          type: currentShuffle,
          currentStep: currentStep
        })
      
    })
      .then(res => res.json())
      .then((data) => {
        if (data.result === "OK") {
          setCountNodes(countNodes + 1)
          showLoading();
          store.dispatch(setMyEncodingFile(imageList[0].file.name));
        } else {
          alert(data.result);
        }
      })
  };


  useEffect(() => {
    // setDimension(targetRef.current.getClientBoundingRect())
    //console.log(targetRef.current.getBoundingClientRect())
    console.log(countNodes);
    if (countNodes > 2) {
      setMargin(margin - 30)
      setCountNodes(1)
    }
    if (currentStep === (maxSteps - 1) && serverState?.state === 'publishing') {
      const childId = addChild({
        name: '',
        imageUrl: animationSteps[currentStep]
      }, currentParent)
      setCurrentParent(childId);
      hideLoading()
      store.dispatch(setMyEncodingFile(''));
    }
  }, [currentStep])

  useEffect(() => {
    if (
      serverState.state === 'publishing' && 
      serverState?.sourceStep < maxSteps -1 && 
      tree.children.length > 0
    ) {
        const nextParent = addBetween({
          name: serverState.sourceStep,
          imageUrl: animationSteps[serverState.sourceStep]
        })
        setCurrentParent(nextParent);
    }
  }, [serverState])


  return (
    <div className="fileUploader">
      <div className="mainSectiontwo" >
        {loading}
        <div className='encodeRandom'>
          <div className="encoderSection">
            <button disabled={serverState?.state !== 'idle'} className="btn generate" name="generate" type="onSubmit"
              onClick={onSubmit}>Generate Randomly</button>

            <ImageUploading
              value={images}
              onChange={onChange}
              dataURLKey="data_url"
            >
              {({
                imageList,
                onImageUpload,
                isDragging,
                dragProps,
              }) => (

                <div className="upload__image-wrapper">
                  <button disabled={serverState?.state !== 'idle' || snapshot !== 'ffhq'} className="btn generate"
                    style={isDragging ? { color: 'red' } : undefined}
                    onClick={onImageUpload}
                    {...dragProps}> Upload your image </button>
             &nbsp;
                </div>
              )}
            </ImageUploading>
          </div>
        </div>
      </div>
      <div ref={targetRef} id="treeWrapper" style={{ width: '600px', height: '10em', marginLeft: `${margin}%`, marginTop: '-65%', position: 'relative' }}>
        <Tree 
          data={tree}
          renderCustomNodeElement={renderRectSvgNode}
        />
      </div>
    </div>
  );
}
