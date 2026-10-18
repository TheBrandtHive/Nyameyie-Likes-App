const likeBtn = document.querySelector("#likeBtn");
const count = document.querySelector("#count");
const likeIcon = likeBtn.querySelector(".like-icon");
const likeText = likeBtn.querySelector(".like-text");
const userList = document.querySelector("#userList");
const card = document.querySelector("#card");
const hearts = document.querySelector("#hearts");

// ---------------------------------------------------------------
// STATE: an array of objects — each user has a name and liked flag
// ---------------------------------------------------------------
const DEFAULT_USERS = [
    { name: "Nyameyie", liked: false },
    { name: "Miriam", liked: false },
    { name: "Audrey", liked: false },
];

// Restore from localStorage, or start fresh.
function loadUsers() {
    try {
        const saved = JSON.parse(localStorage.getItem("users"));
        return Array.isArray(saved) && saved.length ? saved : DEFAULT_USERS.map(u => ({ ...u }));
    } catch (err) {
        return DEFAULT_USERS.map(u => ({ ...u }));
    }
}

let users = loadUsers();

// The signed-in user is the first person in the list (you!).
const ME = 0;

// ---------------------------------------------------------------
// HELPERS: these are the array skills this lesson practises
// ---------------------------------------------------------------

// filter() → count only the users where liked === true
function totalLikes() {
    return users.filter(user => user.liked).length;
}

// find() → get one user by name
function findUser(name) {
    return users.find(user => user.name === name);
}

// save the whole array as JSON
function saveUsers() {
    localStorage.setItem("users", JSON.stringify(users));
}

// ---------------------------------------------------------------
// RENDER: one function draws everything from the state
// ---------------------------------------------------------------
function render() {
    const total = totalLikes();

    // Count line
    count.textContent = total === 1 ? "1 Like" : `${total} Likes`;

    // Main button reflects MY like state
    const meLiked = users[ME].liked;
    if (meLiked) {
        likeBtn.classList.remove("from-pink-500", "to-red-500", "hover:from-pink-600", "hover:to-red-600");
        likeBtn.classList.add("bg-gray-400", "hover:bg-gray-500");
        likeText.textContent = "Liked";
        likeBtn.setAttribute("aria-pressed", "true");
    } else {
        likeBtn.classList.remove("bg-gray-400", "hover:bg-gray-500");
        likeBtn.classList.add("from-pink-500", "to-red-500", "hover:from-pink-600", "hover:to-red-600");
        likeText.textContent = "Like";
        likeBtn.setAttribute("aria-pressed", "false");
    }

    // Classmate list — map() turns each user object into HTML
    userList.innerHTML = "";
    users.forEach((user, index) => {
        const li = document.createElement("li");

        const row = document.createElement("button");
        row.type = "button";
        row.className =
            "user-row w-full flex items-center justify-between px-3 py-2 rounded-md " +
            (user.liked ? "bg-pink-50 text-pink-600" : "bg-gray-50 text-gray-500 hover:bg-gray-100");

        const nameSpan = document.createElement("span");
        nameSpan.textContent = user.name + (index === ME ? " (you)" : "");

        const stateSpan = document.createElement("span");
        stateSpan.textContent = user.liked ? "❤️ Liked" : "🤍 Like";

        row.append(nameSpan, stateSpan);

        // Anyone can toggle their like by clicking their row
        row.addEventListener("click", () => toggleLike(index));

        li.appendChild(row);
        userList.appendChild(li);
    });
}

// ---------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------
function toggleLike(index) {
    users[index].liked = !users[index].liked;
    if (users[index].liked && index === ME) popHeart();

    saveUsers();
    render();
}

// Main button = toggles MY like only
likeBtn.addEventListener("click", () => toggleLike(ME));

// Small heart "pop" animation on like
function popHeart() {
    likeIcon.classList.add("pop");
    setTimeout(() => likeIcon.classList.remove("pop"), 250);
}

// ---------------------------------------------------------------
// DOUBLE-TAP: two taps/clicks on the card within 350ms → heart burst
// (Date.now() timestamps — no timers needed for detection)
// ---------------------------------------------------------------
let lastTapTime = 0;

card.addEventListener("pointerdown", () => {
    const now = Date.now();
    if (now - lastTapTime < 350) {
        burstHearts();
        if (!users[ME].liked) toggleLike(ME); // double-tap also likes for you
        lastTapTime = 0; // reset so a triple-tap doesn't fire twice
    } else {
        lastTapTime = now;
    }
});

function burstHearts() {
    for (let i = 0; i < 8; i++) {
        const heart = document.createElement("span");
        heart.className = "burst-heart";
        heart.textContent = "❤️";
        // Random horizontal position + slight delay so they don't all rise together
        heart.style.left = 10 + Math.random() * 80 + "%";
        heart.style.animationDelay = i * 60 + "ms";
        hearts.appendChild(heart);

        // Clean up each element after its animation finishes
        heart.addEventListener("animationend", () => heart.remove());
    }
}

// ---------------------------------------------------------------
// First draw on page load
// ---------------------------------------------------------------
render();
