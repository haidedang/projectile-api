import React from 'react';
import styles from './Login.css';
import AuthentificationService from '../../services/AuthentificationService';

class Login extends React.Component { 
  constructor(props) { 
    super(props);
    this.state = {username:'', password:''};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event){ 
    switch (event.target.type){
      case 'text':
        this.setState({username: event.target.value})
        break;
      case 'password':
        this.setState({password:event.target.value});
    }
  }

  handleSubmit(event) { 
    console.log('clicked')
    AuthentificationService.login(this.state.username, this.state.password);
  }

  render(){
    return(
       <div className="container">
        <div className="card card-container">
            <img id="profile-img" className="profile-img-card" src="//ssl.gstatic.com/accounts/ui/avatar_2x.png" />
            <p id="profile-name" className="profile-name-card"></p>
            <form className="form-signin">
                <span id="reauth-email" className="reauth-email"></span>
                <input value={this.state.username} onChange={this.handleChange} type="text" id="inputEmail" className="form-control" placeholder="Email address" required autofocus/>
                <input type="password" id="inputPassword" className="form-control" placeholder="Password" required/>
                <div id="remember" className="checkbox">
                    <label>
                        <input type="checkbox" value="remember-me"/> Remember me
                    </label>
                </div>
                <button className="btn btn-lg btn-primary btn-block btn-signin" type="submit" onClick={this.handleSubmit}>Sign in</button>
            </form>
            <a href="#" className="forgot-password">
                Forgot the password?
            </a>
        </div>
    </div>
    )
  }
}

export default Login;
