import React, { useEffect, useState } from "react";
import { useSelector } from 'react-redux';
import { useForm } from "react-hook-form";
import Footer from './Footer.js';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import store, { clearAnimationSteps, moveSteps, setStep, setMaxSteps } from '../state';
import SaveForm from "./SaveForm";
import EncoderSection from "./EncoderSection";
import Slider from '@material-ui/core/Slider';
import useSpinner from './useSpinner';

const useStyles = makeStyles((theme) => ({
  root: {
    background: "black",
    border: "white",
    backgroundColor: "black",
    width: '500px'
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 140,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  }
}))

export default function Generate() {
  const [view, setView] = useState();
  const { register, handleSubmit } = useForm({ mode: "onBlur" });
  const classes = useStyles();
  const [dataset, setDataset] = useState('person');
  const [snapshot, setSnapshot] = useState('ffhq');
  const [generating, setGenerating] = useState('use_step');
  const maxSteps = useSelector(state => state.maxSteps);
  const animationSteps = useSelector(state => state.animationSteps);
  const currentStep = useSelector(state => state.currentStep);
  const currentShuffle = useSelector(state => state.currentShuffle);
  const serverState = useSelector(state => state.serverState);
  const ENDPOINT = useSelector(state => state.ENDPOINT);
  const [isGenerated, setIsGenerated] = useState(false);
  const [pageTitle, setPageTitle] = useState('EXPLORER TOOL');
  const [finishGenerating, setFinishGenerating] = useState(false)
  const [loading, showLoading, hideLoading] = useSpinner();

  const searchParams = new URLSearchParams(window.location.search);

  const handleChange = (event) => {
    if (searchParams.has('marrow')) {
      if (event.target.value === 'person') {
        setSnapshot('ffhq')
      } else if (event.target.value === 'happy') {
        setSnapshot('007743')
      }
      setDataset(event.target.value);
    }
  };

  const onSubmit = (values, ev) => {
    store.dispatch({
      type: 'SAVE_SNAPSHOT',
      snapshot: snapshot
    })
    store.dispatch({
      type: 'SAVE_TYPE_DATASET',
      dataset: dataset
    })
    const form = ev.target;
    const data = {
      // dataset: form.dataset.value,
      dataset: dataset,
      steps: form.steps.value,
      snapshot: snapshot,
      type: currentShuffle,
      currentStep: currentStep
    }
    store.dispatch(clearAnimationSteps());
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
          throw new Error(data.result);
        }
      })
      .then(res => res.json())
      .then((data) => {
        console.log("Publish result", data);
        if (data.result === "OK") {
          console.log("Server is publishing!");
        } else {
          alert(data.result);
        }
      })
      .then(() => {
        showLoading();
      })
      .catch((e) => {
        console.log("Error generating", e);
      })
  };

  function changingPageTitle() {
    if (dataset === 'person') {
      setPageTitle('This Person Does Not Exist')
    } else if (dataset === 'happy') {
      setPageTitle('Happy Families Dinner')
    }
  }

  const getImage = async (direction, steps) => {
    await fetch(ENDPOINT + '/generate?direction=' + direction + '&steps=' + steps + '&shadows=0')
      .then(response => response.json())
      .then(data => {
        setView("data:image/jpeg;base64," + data.result)
      }).catch(err => {
        console.log("Error Reading data " + err);
      })
  }

  const handleStepsChange = (e) => {
    store.dispatch(
      setMaxSteps(e.currentTarget.value)
    )
  }
  const handleStepSliderChange = (e, val) => {
    store.dispatch(setStep(
      val
    ))
  }

  useEffect(() => {
    console.log("STATE", serverState.state, "isGenerated", isGenerated)
    if (serverState.state !== 'idle' && !isGenerated) {
      console.log("TOGGLING", dataset);
      setTimeout(() => {
        changingPageTitle()
        hideLoading()
        setIsGenerated(true);
      }, 100)
    }
  }, [serverState])

  return (
    <>
      <h1 className="secondTitle">{pageTitle}</h1>
      {serverState?.state == 'encoding' && (
        <div className="now-encoding" >
          <span className='encoding-loder-text'>Someone is encoding {serverState?.file}<br /><br />
            Please hold...</span>
          <br />
          <span className='encoding-loder-text small'>It may take a few minutes.</span>
          {loading}
        </div>
      )}

      <div className="main">
        <div className="mainSection" >
          <div className="container" >

            {isGenerated ?
              <EncoderSection />
              :
              <form key={1} className="shuffleForm" onSubmit={handleSubmit(onSubmit)} >
                {searchParams.has('marrow')
                  ?
                  (
                    <FormControl required className={classes.formControl} >

                      <InputLabel className="inputNew" id="demo-simple-select-helper-label" >Choose a dataset</InputLabel>
                      <Select className="select dataset" name="dataset" autoComplete="off"
                        labelId="demo-simple-select-helper-label"
                        id="demo-simple-select-helper"
                        value={dataset}
                        onChange={handleChange}
                        ref={register}
                      >
                        <MenuItem value={"person"}>This Person Does Not Exist</MenuItem>
                        <MenuItem value={"happy"} >Happy Families Dinner</MenuItem>
                      </Select>
                      <FormHelperText>Load a dataset of your intreset</FormHelperText>
                    </FormControl>
                  ) : (
                    <p className='alternative-DStitle'>This Person Does Not Exist </p>
                  )

                }

                <div className="stepsDiv">
                  <label className="label steps"> Number of frames:</label>
                  <input className="input steps" autoComplete="off" name="steps" value={maxSteps} type="number" onChange={handleStepsChange} />
                  <FormHelperText>Choose number of frames of the animation sequence &mdash;<br />
                    The bigger the number the longer the animation will be <br />
                    and the longer it will take to generate.</FormHelperText>
                </div>

                <div className="divBtnGnr">
                  <button className="btn generate" name="generate" type="onSubmit" ref={register}>Generate animation</button>
                </div>
              </form>
            }

            {loading}

            <div className="imgControler">
              <div className="output-container">
                <img className="imgAnimation" src={animationSteps?.length > 0 ? animationSteps[currentStep] : ' '} width="512" height="512" alt="" />
              </div>
              <div className="controls-container">
                <div className={classes.root}>
                  <Slider
                    id="step-slider"
                    name="step-slider"
                    value={currentStep}
                    onChange={handleStepSliderChange}
                    defaultValue={0}
                    step={1}
                    min={0}
                    max={maxSteps - 1}
                  />
                </div>
              </div>
            </div>

          </div>
          {isGenerated ?
            <SaveForm /> : ''}
        </div>
      </div>
      <Footer />
    </>
  );
}
