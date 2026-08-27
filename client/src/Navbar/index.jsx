import "./index.css";

const GetUserProfile = ({ user }) => {
  console.log(user);
  const { username, avtar_url } = user;
  return (
    <li>
      <div className="tooltip">
        <img src={avtar_url} className="profile-avatar" alt={username} />
        <span className="tooltiptext">{username}</span>
      </div>
    </li>
  );
};

const Navbar = ({ usersData }) => {
  return (
    <nav>
      <h1 className="navbar-heading">SyncScript</h1>
      <ul className="profile-list">
        {usersData
          ? usersData.map((user) => (
              <GetUserProfile key={user.socket_id} user={user} />
            ))
          : null}
      </ul>
    </nav>
  );
};

export default Navbar;
