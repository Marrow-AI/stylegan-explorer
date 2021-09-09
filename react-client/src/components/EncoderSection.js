import React, { useState, useEffect, useRef } from "react";
import ImageUploading from 'react-images-uploading';
import store, { setMyEncodingFile } from '../state';
import { useSelector } from 'react-redux';
import useSpinner from './useSpinner';
import Tree from 'react-d3-tree';
import { hierarchy, tree as d3Tree } from "d3";
import { cloneDeep, uniqueId } from 'lodash';
import useDimensions from 'react-use-dimensions';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles } from '@material-ui/core/styles';
import { InputLabel } from "@material-ui/core";
import { pink } from "@material-ui/core/colors";

const useStyles = makeStyles({
  root: {
    color: 'white',
    cursor: 'pointer',
    
      borderRadius: '120px',
    '&:hover': {
      backgroundImage: "linear-gradient(to right, #eebbf9, #e497f5,#e882ff)",   
      },
    "& .MuiFormLabel-root": {
      color: 'white',
      fontSize:'14px',
      fontFamily: 'Lato',
      textAlign: 'center',
      fontWeight: '700',
      backgroundColor: 'transparent !important',
      
    },
    "& .MuiSelect-select" : {
      border: '2px solid #EEBBF9',
      borderRadius: '120px',
    },
     "& .MuiInputBase-root" : {
      border: '2px solid #EEBBF9',
      borderRadius: '40px',
      cursor: 'pointer',
      height: '55px !important',
    },
    "& input" : {
      cursor: 'pointer',
    }, 
    "& .Mui-disabled" : {
      border: "2px solid rgb(25, 25, 25)",
      backgroundColor: "rgb(25, 25, 25)",
      color: "#666666",
      cursor: "no-drop"
    },
    "& .MuiInputLabel-root": {
      border: "2px solid rgb(25, 25, 25",
      backgroundColor: "rgb(25, 25, 25)",
    }, 
  },
});


export default function EncoderSection(props) {
  const dataset = useSelector(state => state.dataset);
  const [loading, showLoading, hideLoading] = useSpinner();
  const ENDPOINT = useSelector(state => state.ENDPOINT);
  const [images, setImages] = useState([]);
  const maxFileSize = 3000000;
  const currentStep = useSelector(state => state.currentStep);
  const currentShuffle = useSelector(state => state.currentShuffle);
  const snapshot = useSelector(state => state.snapshot);
  const maxSteps = useSelector(state => state.maxSteps);
  const animationSteps = useSelector(state => state.animationSteps);
  const serverState = useSelector(state => state.serverState);
  const [r, setR] = useState(35)
  const [click, setClick] = useState(false)
  const [margin, setMargin] = useState(-18);
  const [showDrag, setShowDrag] = useState(false)
  const [showDragOnce, setShowDragOnce] = useState(0)
  const [runOnce, setRunOnce] = useState(false)
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

  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);

  const handleClick = () => {
    setClick(!click)
    if (click) {
      setR(55)
    }
    if (!click) {
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
      children: [lastChild.data],
    }
    parent.data.children = [between];
    console.log("Tree", treeClone);
    setTree(treeClone);
    return between.attributes.uuid;
  }

  const handleRandom = () => {
    generate('shuffle', {})
  }
  
  const handleTag = () => {
    if (selectedTag) {
      generate('gototag', { tagid: selectedTag.id })
    }    
  }

  const generate = (action, params) => {
    const data = {
      dataset: dataset,
      steps: maxSteps,
      snapshot: snapshot,
      type: currentShuffle,
      currentStep: currentStep,
      ...params
    }
    fetch(ENDPOINT + '/' + action, {
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
  }

  const onTagSearchChange = (event) => {
    console.log("Set tag search", event.currentTarget.value)
    setTagSearch(event.currentTarget.value);
    setSelectedTag(null);
    setTagsLoading(true);
    
  }

  useEffect(() => {
    // setDimension(targetRef.current.getClientBoundingRect())
    //console.log(targetRef.current.getBoundingClientRect())
    if (countNodes > 2) {
      setMargin(margin - 20)
      setCountNodes(1)
      setShowDragOnce(showDragOnce + 1)
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
      serverState?.sourceStep < maxSteps - 1 &&
      tree.children.length > 0
    ) {
      const nextParent = addBetween({
        name: serverState.sourceStep,
        imageUrl: animationSteps[serverState.sourceStep]
      })
      setCurrentParent(nextParent);
    }
    if (serverState.state === 'idle' && serverState.lastError) {
      hideLoading()
    }
  }, [serverState])

  useEffect(() => {
    if (showDragOnce === 4 && !runOnce) {
      setShowDrag(true)
      setRunOnce(true)
      setTimeout(() => {
        setShowDrag(false)
      }, 10000)
    }
  }, [countNodes])

  useEffect(() => {
    let active = true;

    if (!tagsLoading) {
      return undefined;
    }

    (async () => {
      try {
        const response = await fetch(`${ENDPOINT}/tags?dataset=${dataset}&snapshot=${snapshot}&search=${tagSearch}`)
        const result = await response.json();

        if (active) {
          console.log("Result for " + tagSearch, result);
          const resultOptions = result.map(obj => ({ id: obj[0], name: obj[1]}));
          console.log("Options", resultOptions);
          setOptions(resultOptions);
          setTagsLoading(false);
        }
      } catch(e) {
        console.log("Could not fetch options");
        setTagsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [tagsLoading]);

  useEffect(() => {
    if (!open) {
      setOptions([]);
    }
  }, [open]);

  useEffect(() => {
    handleTag()    
    
  },[selectedTag])

  const classes = useStyles();

  return (
    <div className="fileUploader">
      <div className="mainSectiontwo" >
        {loading}
        <div className='encodeRandom'>
          <div className="encoderSection">
            <button disabled={serverState?.state !== 'idle'} className="btn generate" name="generate" type="onSubmit"
              onClick={handleRandom}>Generate Randomly</button>

            <ImageUploading
              value={images}
              onChange={onChange}
              dataURLKey="data_url"
              maxFileSize={maxFileSize}
            >
              {({
                imageList,
                onImageUpload,
                isDragging,
                dragProps,
                errors
              }) => (
                <div className="upload__image-wrapper">
                  <button disabled={serverState?.state !== 'idle' || snapshot !== 'ffhq'} className="btn generate"
                    style={isDragging ? { color: 'red' } : undefined}
                    onClick={onImageUpload}
                    {...dragProps}> Upload your image </button>
                  &nbsp;
                  {errors &&
                    <div>
                      {errors.maxFileSize && 
                      <span style={{ fontSize: '12px', color: 'red', textAlign: 'center' }}>
                        Your image size exceed max file size,
                        <br /> Please upload up to 3MB.</span>}
                    </div>}
                </div>
              )}
            </ImageUploading>

            <div>
        
            <Autocomplete
              id="tag-search"
              className={classes.root}
              disabled={serverState?.state !== 'idle' }
              style={{ 
                position: 'absolute',
                width: 230, 
                display:'inline-block',
                color: 'white',
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginTop: '20%'
              }}
              open={open}
              onOpen={() => {
                setOpen(true);
                setTagsLoading(true);
              }}
              onClose={() => {
                setOpen(false);
              }}

              getOptionSelected={(option, value) => option.name === value.name}
              getOptionLabel={(option) => option.name}
              options={options}
              onChange={(e, value) => {
                setSelectedTag(value)
              }}
              loading={tagsLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className={classes.root}
                  label="Load a tag"
                  variant="outlined"
                  disabled={serverState?.state !== 'idle' }
                  onChange = {onTagSearchChange}
                  InputProps={{
                    ...params.InputProps,
                    classes: {root: classes.root},
                    endAdornment: (
                      <React.Fragment>
                        {tagsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
            />
          </div>
          </div>
        </div>
      </div>

      <div className="treeWrapper" ref={targetRef} id="treeWrapper" style={{ width: '700px', height: '10em', marginLeft: `${margin}%`, marginTop: '-55%', position: 'relative' }}>
        <img className="dragImg" src='./drag.png' alt='drag' height="40px" style={{ visibility: showDrag ? 'visible' : 'hidden' }} />
        <Tree
          data={tree}
          renderCustomNodeElement={renderRectSvgNode}
        />
      </div>
    </div>
  );
}
