export async function textSequential(text, setter, slower = 5) {
    slower = slower * 20;
    function sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }
    for (let i = 0; i <= text.length; i++) {
      let part = text.substring(0, i);
      if (text.length != i) {
        setter(part + "|");
      } else {
        setter(part);
      }
      await sleep(1 * slower);
    }
  }
  
  export async function textSequentialBack(text, setter, slower = 5) {
    slower = slower * 20;
    function sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }
    for (let i = text.length; i >= 0; i--) {
      let part = text.substring(0, i);
      if (text.length != i) {
        setter(part + "|");
      } else {
        setter(part);
      }
      await sleep(1 * slower);
    }
  }
  
  export async function textRandom(text, setter, slower = 5) {
    slower = slower * 20;
    function sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }
    function generateRandomArray(range) {
      return Array.from({ length: range }, (_, index) => index).sort(
        () => Math.random() - 0.5
      );
    }
    function replaceCharAtPosition(originalString, position, replacementChar) {
      if (position < 0 || position >= originalString.length) {
        return originalString;
      }
      const stringArray = originalString.split("");
      stringArray[position] = replacementChar;
      const modifiedString = stringArray.join("");
      return modifiedString;
    }
    function generateRandomString(length) {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let randomString = "";
  
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
      }
  
      return randomString;
    }
  
    let dummy_text = generateRandomString(text.length);
  
    for (const number of generateRandomArray(text.length)) {
      dummy_text = replaceCharAtPosition(dummy_text, number, text[number]);
      setter(dummy_text);
      await sleep(1 * slower);
    }
  }
  
  export function toTitleCase(str) {
    return str.replace(/\b\w/g, (match) => match.toUpperCase());
  }