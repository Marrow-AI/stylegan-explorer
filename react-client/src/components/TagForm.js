import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import { useSelector } from 'react-redux';
import store, {clearAnimationSteps, setMaxSteps} from '../state';
import { ToastContainer, toast } from "react-toast";

const useStyles = makeStyles((theme) => ({
  root: {
    background: "black",
    border: "white",
    backgroundColor: "black"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  }
}))

export default function SaveForm() {
  const [animation, setAnimation] = useState([]);
  const { register: register2, handleSubmit: handleSubmit2 } = useForm({ mode: "onBlur" });
  const classes = useStyles();
  const [animationClip, setanimationlip] = useState('');
  const snapshots = useSelector(state => state.snapshot);
  const getImage = useSelector(state => state.getImage);
  const ENDPOINT = useSelector(state => state.ENDPOINT);
  const dataset = useSelector(state => state.dataset);
  const snapshot = useSelector(state => state.snapshot);
  const currentStep = useSelector(state => state.currentStep);

  const handleTag = (values, e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value,
      dataset,
      snapshot,
      currentStep
    }
    fetch(ENDPOINT + '/tag', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then((data) => {
        if (data.result !== "OK") {
          alert(data.result);
        } else {
          form.name.value = "";
          notification()
        }
      })
  }

  const notification = () => {
    toast(`Your tag has been saved`, {
      backgroundColor: '#C4FE00',
      color: '#000000',
    })
  }

  const handleAnimation = (event) => {
    setanimationlip(event.target.value);
  }

  const listAnimations = async (animationSelect) => {
    await fetch(ENDPOINT + '/list')
      .then(response => response.json())
      .then(data => {
        data.animations.forEach((text) => {
          setAnimation([...animation, ...data.animations]);
        })
      });
  }

  useEffect(() => {
    //listAnimations(animation);
  }, [])

  return(
    <>
    <form className="tagForm" key={2} id="save" onSubmit={handleSubmit2(handleTag)}> 
      {/* <label className="label save">Tag this frame:</label> */}
      <input className="input save" required maxLength="80" autoComplete="off" name="name" type="text" placeholder="tag this frame" ref={register2} />
      <button className="btn download" name="tag" type="submit" ref={register2}>save tag</button> 
    </form>
    <ToastContainer position='top-left' delay={8000} />
  </>
  )
}
