import React from 'react'
import {render} from 'react-dom'
import {createStore, applyMiddleware} from 'redux'
import {Provider, connect} from 'react-redux'
import throttle from 'lodash/throttle'

const loadState = () => {
  try {
    const stringifiedState = localStorage.getItem('state')
    if (stringifiedState === null) {
      // Return undefined instead of null so that the reducer will initialize the state.
      return undefined
    }
    return JSON.parse(stringifiedState)
  } catch (err) {
    // Either there was a parsing error from a corrupted state or the user's
    // privacy settings don't allow us to read from localStorage.
    return undefined
  }
}

const saveState = throttle((state) => {
  try {
    localStorage.setItem('state', JSON.stringify(state))
  } catch (err) {
    // Ignore write errors.
  }
}, 1000)

const storageMiddleware = (store) => (next) => (action) => {
  saveState(store.getState())
  next(action)
}

const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = '0' + Math.floor(totalSeconds % 60)
  return `${minutes}:${seconds.slice(-2)}`
}

const formatUnixTime = (unixTime) => {
  const date = new Date(unixTime)
  const hours = date.getHours()
  const minutes = '0' + date.getMinutes()
  const seconds = '0' + date.getSeconds()
  return `${hours}:${minutes.slice(-2)}:${seconds.slice(-2)}`
}

const decrementSecond = () => ({type: 'DECREMENT_SECOND'})
const toggleRunning = () => ({type: 'TOGGLE_RUNNING'})
const reset = () => ({type: 'RESET'})
const changeTask = (task) => ({type: 'CHANGE_TASK', task})
const completeTask = (timeEnd) => ({type: 'COMPLETE_TASK', timeEnd})
const removeTask = (i) => ({type: 'REMOVE_TASK', i})
const toggleEditStartTime = () => ({type: 'TOGGLE_EDIT_START_TIME'})
const changeStartTime = (startTime) => ({type: 'CHANGE_START_TIME', startTime})

const initialState = {
  startTime: 5 * 60,
  time: 5 * 60,
  running: false,
  task: '',
  tasks: [],
  editStartTime: false,
}

const timer = (state = initialState, action) => {
  switch (action.type) {
    case 'DECREMENT_SECOND':
      return {...state, time: Math.max(0, state.time - (state.running ? 1 : 0))}
    case 'TOGGLE_RUNNING':
      return {...state, running: !state.running}
    case 'RESET':
      return {...state, time: state.startTime}
    case 'CHANGE_TASK':
      return {...state, task: action.task}
    case 'COMPLETE_TASK':
      return {...state, tasks: [...state.tasks, {text: state.task, timeEnd: action.timeEnd}]}
    case 'REMOVE_TASK':
      const {i} = action
      return {...state, tasks: [...state.tasks.slice(0, i), ...state.tasks.slice(i + 1)]}
    case 'TOGGLE_EDIT_START_TIME':
      return {...state, editStartTime: !state.editStartTime, running: false}
    case 'CHANGE_START_TIME':
      return {...state, startTime: action.startTime, time: action.startTime}
    default:
      return state
  }
}

setInterval(() => store.dispatch(decrementSecond()), 1000)

let TaskTimer = ({startTime, time, running, task, tasks, 
  editStartTime, toggleRunning, reset, changeTask, completeTask, removeTask, changeStartTime, toggleEditStartTime}) =>
  <div>
    <div className="col-sm-4 col-sm-offset-4">
      <h2 className="text-center">Current Task</h2>
      <textarea className="form-control" placeholder="Enter your current task." onChange={e => changeTask(e.target.value)} value={task} />
    </div>
    <div className="col-sm-4 col-sm-offset-4 text-center">
      {editStartTime ?
        <div>
          <h2>Start seconds</h2>
          <input className="form-control" onChange={e => changeStartTime(parseInt(e.target.value))} value={startTime} />
          <button className="btn btn-default form-control" onClick={toggleEditStartTime}>Done</button>
        </div> :
        <h2 onClick={toggleEditStartTime}>{time}</h2>}
      <div style={{marginTop: 10}}>
        <button className="btn btn-default" onClick={toggleRunning}>{running ? 'Stop' : 'Start'}</button>
        <button className="btn btn-default" onClick={reset}>Reset</button>
        <button className="btn btn-default" onClick={() => completeTask(Date.now())}>Task Done</button>
      </div>
    </div>
    <div className="col-sm-4 col-sm-offset-4 text-center">
      {tasks.length > 0 ? <h2>Tasks</h2> : null}
      {tasks.map((task, i) =>
        <div key={i}>
          {task.text || 'Task'}
          {' - '}
          {formatUnixTime(task.timeEnd)}
          <span onClick={() => removeTask(i)}><i className="glyphicon glyphicon-remove" /></span>
        </div>
      )}
    </div>
  </div>

const mapStateToProps = ({startTime, time, running, task, tasks, editStartTime}) => ({
  startTime, time: formatTime(time), running, task, tasks, editStartTime
})
const mapDispatchToProps = 
  {toggleRunning, reset, changeTask, completeTask, removeTask, changeStartTime, toggleEditStartTime}

TaskTimer = connect(mapStateToProps, mapDispatchToProps)(TaskTimer)

const store = createStore(timer, loadState(), applyMiddleware(storageMiddleware))
const root = <Provider store={store}><TaskTimer /></Provider>
const rootEl = document.querySelector('#root')
render(root, rootEl)
