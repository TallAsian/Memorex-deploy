function SearchButton(keyword, search, onChange){
    const pressEnter = (e) =>{
        if (e.key === "Enter") {
          document.getElementById("searchButton").click();
        }
      };
      const BarStyle = { width: "20rem", background: "#F0F0F0", border: "none", padding: "0.5rem" };
      return (
        <div>
          <input style={BarStyle} key="search-bar" value={keyword} placeholder={"Search Physician"} onChange={onChange} onKeyDown={pressEnter}/>
          <button id="searchButton" onClick={() => search} onKeyDown={pressEnter}>Search</button>
        </div>
      );
}

export default SearchButton;