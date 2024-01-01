export function isValidNumber(number) {
    try {
      number = number.trim();
      if (isNaN(Number(number))) {
        return "Not Numerical";
      }
      if (number.length < 5 || number.length > 18) {
        return "Invalid Length, Must Be Between 5-18";
      }
      return true;
    } catch {
      return "Invalid Number";
    }
  }
  
  export function isValidPassword(password) {
    try {
      if (password.length < 5 || password.length > 18) {
        return "Invalid Length, Must Be Between 5-18";
      }
      return true;
    } catch {
      return "Invalid Password";
    }
  }
  
  export function isValidUserName(name) {
    try {
      name = name.trim();
      if (name.length < 5 || name.length > 16) {
        return "Invalid Length, Must Be Between 5-16";
      }
      const regex = /^[a-zA-Z0-9\s]+$/;
      if (!regex.test(name)) {
        return "Name Can Only Contain letters, Numbers and White Space";
      }
      return true;
    } catch {
      return "Invalid Name";
    }
  }
  
  // Generated Using ChatGPT
  
  export function isValidPort(port) {
    const portRegex =
      /^(?:[1-9]\d{0,4}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/;
    return portRegex.test(port);
  }
  
  export function validateInputText(inputString) {
    if (inputString.includes("%")) {
      return false;
    } else {
      return true;
    }
  }
  // Generated Using ChatGPT