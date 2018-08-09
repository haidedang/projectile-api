import React from 'react';
import Select from 'react-select';
import './Booking.css';
import { FaPlayCircle } from 'react-icons/fa';
import { IconContext } from 'react-icons';
import getSelectOptions from '../../../reducers';

const options = [
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'strawberry', label: 'Strawberry' },
  { value: 'vanilla', label: 'Vanilla' }
];

class Booking extends React.Component {
  state = {
    selectedOption: null
  };

  constructor(props) {
    super(props);
    this.handlePackageChange = this.handlePackageChange.bind(this);
  }

  handlePackageChange(selectedOption) {
    this.setState({ selectedOption });
    console.log(`Option selected:`, selectedOption);
  }

  render() {
    const { selectedOption } = this.state;

    //TODO: There must be another way to update the freaking state
    if (sessionStorage.options) {
      return (
        <div className="container">
          <div className="card card-container">
            <h2>Booking</h2>
            <p id="profile-name" className="profile-name-card" />
            <span id="reauth-email" className="reauth-email" />
            <Select
              placeholder="Select Package"
              value={selectedOption}
              onChange={this.handlePackageChange}
              options={JSON.parse(sessionStorage.options).map(item => {
                return { value: item.no, label: item.name };
              })}
            />
            <br />
            <input
              type="text"
              id="inputPassword"
              value={this.state.package}
              onChange={this.handleChange}
              className="form-control"
              placeholder="description"
              required
            />
            <br />
            <IconContext.Provider
              value={{ color: 'green', className: 'global-class-name' }}
            >
              <span>
                <FaPlayCircle
                  onClick={this.handlePackageChange}
                  id="start"
                  size={50}
                />
              </span>
            </IconContext.Provider>
          </div>
        </div>
      );
    } else return null;
  }
}

export default Booking;
