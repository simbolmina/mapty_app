'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// for running or cycling event we will use classes. in order to archive this first we creat a parent class in the name of Workout then we will create child classes as running and cycling.
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //will give us date in milisec. not usefull in rl
  //we need an idea for each event in app. usually third party libraries used for this purporse.
  //but here we use dates as id, convert them into array and use their last 10 chars.
  clicks = 0;
  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    //in order to immediately colculate pace, we add this function to constructor as well
    this._setDescription();
  }

  calcPace() {
    // min /km
    this.pace = this.duration / this.distance;
    return this;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60); // want it in h not min
    return this.speed;
  }
}

// experiment whether our classes works
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 15, 523);

// console.log(run1, cycling1);

///////// APPLICATION ARCITECTURE /////////////

//we created some global variables to make code work then we moved them in class while refactoring our code
// global variables we need from navigator function. we create global variables then use them in form event listener.
//let map, mapEvent;

// this class is our main app arctechture. it wont work itself unless we creat an object out of it (llok below
// we want our code is clean and all together. having most of things in a class is a good way for small application.

class App {
  // we dont want global variables as much as possible. so having private class fileds is way to go.
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    this._getPosition();
    //since app object is createt, _getPosition() will be called as soon as page loaded.
    //contratctor function is called as soon as new object created from the class.
    //getting position from constractor function is way to go.

    // Get data from local storage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    //if we dont bind newWorkout() to the app itself, in newWorkout() method, this keyword will point form element. in classes we will always need to bind this keyword to app itself or else it wont work.

    //event listener for changing event type (running or cycling)
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      //if we have geolocation API working get current position
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        //this._loadMap() is called by getCurrentPosition() method. this is treaded as regular funtion call
        //in a regular function this keyword is set as undefined.
        //to menually bind this keyword will be our solution.
        function () {
          alert('Could not get your position');
          // if user does not allow map API we give them an error message
        }
      );
  }

  _loadMap(position) {
    //console.log(position);
    const { latitude } = position.coords; // position coords has these info
    const { longitude } = position.coords;
    //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    // code from map API
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // map id should be in HTML as well

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkOutMarker(work);
      // we have to wait map to load before loading markers.
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    //eventhandler when clicked on map
    form.classList.remove('hidden');
    inputDistance.focus();
    //user can immediately start typing
  }

  _hideForm() {
    //emtyp inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none'; // to change form to new entry immediately.
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    //in parent classes (.from__row) toggle .hidden when chaning type. only one will have hidden at at time.
  }

  _newWorkout(event) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    //function that chech every parameter we put in whether it is valid or not.
    //we loop over every given parameters and if every of them is true then we return true.
    // ... rest parameter will give us an array, we loop over this array and chech if all of them are number.
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // another helper function that let us chech if inputs are postive numbers.
    // takes in arbitrary amount of input, return only true if all of them are true.
    event.preventDefault();

    // get data from dform
    const type = inputType.value;
    const distance = +inputDistance.value; // convert them into number with +
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // check if data is valid

    //if activity running, create running objeck
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        //vvalidInput function is replacement of those parameters obove.
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        // if parameter is not a number return error (guard clouse)
        // check oppose. if opposite is true return immediately
        return alert('Input have to be positive number!');

      workout = new Running([lat, lng], distance, duration, cadence);
      // this.#workouts.push(workout);
    }

    //if activity cycling, create cyclng objeck

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration) //elevation can be negative
      )
        return alert('Input have to be positive number!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // render workout on map as marker
    this._renderWorkOutMarker(workout);

    // render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input field
    this._hideForm();

    // Set local storeage to all workouts

    this._setLocalStorage();
  }

  _renderWorkOutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          //we got this method from API documents and set the popup as we please
          maxWidth: 250,
          minWidth: 100,
          autoClose: false, //wont close when clicked somewhere else
          closeOnClick: false,
          className: `${workout.type}-popup`, //added a class to change visiual
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      ) //method from documents, change popup content
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    console.log(workoutEl);

    if (!workoutEl) return; // guard clouse again.

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // console.log(workout);
    // console.log(this.#workouts);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using the public interface

    //workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    //local storage is a local API. first argument is name of the storage space, second is what to store.
    // Second argument should be a string: thats why we use JSON.stringify() method to covert our array into a string.
    // local storage is very simple APi and should be used for very small amount of data. big data will slow down our application
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // what we do here is apposite of what we done above. convert stored string into an array
    // console.log(data);

    if (!data) return;
    // if there is not data return immediately

    this.#workouts = data;
    // if there is stored data (const data) thats equal our #workouts array.
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // loop over this data and use them in _renderworkout method (which render workout on side bar)
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

// to make main app work, we create an object from App class.
const app = new App();
