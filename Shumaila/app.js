/* app.js - Vanilla JS client for THE REVIVED GOODS
   Features:
   - Listings with filters (condition, category, price, search)
   - Add to cart, wishlist, save for later
   - Sell & Donate forms that add listings (persisted in localStorage)
   - Simple sorting and active-filters display
*/

const CONDITIONS = ['LIKE_NEW','GOOD','FAIR','FOR_PARTS','VINTAGE'];

// initial sample product set
const DEFAULT_PRODUCTS = [
  { id: genId(), title:'Vintage Wooden Chair', images:['https://picsum.photos/seed/chair/800/600'], price:2500, category:'Furniture', condition:'VINTAGE', type:'SELL', description:'Solid teak, great patina.'},
  { id: genId(), title:'Used iPhone 11', images:['https://picsum.photos/seed/phone/800/600'], price:12000, category:'Electronics', condition:'GOOD', type:'SELL', description:'Battery 85%.'},
  { id: genId(), title:'Box of Books', images:['https://picsum.photos/seed/books/800/600'], price:0, category:'Books', condition:'GOOD', type:'DONATE', description:'Assorted fiction.'},
  { id: genId(), title:'Nike Running Shoes', images:['https://picsum.photos/seed/shoes/800/600'], price:2500, category:'Fashion', condition:'LIKE_NEW', type:'SELL', description:'Lightly used, size 8.'}
];

function genId(){ return 'id_'+Math.random().toString(36).slice(2,9) }

function qs(sel){ return document.querySelector(sel) }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)) }

// ------- State & storage -------
const STORE_KEY = 'revived_goods_state_v1';
const state = loadState();

function loadState(){
  const raw = localStorage.getItem(STORE_KEY);
  if(raw) {
    try { return JSON.parse(raw) } catch(e){}
  }
  // base default:
  return {
    products: DEFAULT_PRODUCTS.slice(),
    cart: [],
    saved: [],       // save for later (cart-saved)
    wishlist: [],
  }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)) }

// ------- DOM references -------
const listingsEl = qs('#listings');
const emptyEl = qs('#emptyState');
const wishCount = qs('#wishCount');
const cartCount = qs('#cartCount');
const drawer = qs('#drawer');
const drawerTitle = qs('#drawerTitle');
const drawerContent = qs('#drawerContent');
const drawerBtn = qs('#cartBtn');
const wishlistBtn = qs('#wishlistBtn');
const closeDrawerBtn = qs('#closeDrawer');

const categorySelect = qs('#categorySelect');
const minPriceInput = qs('#minPrice');
const maxPriceInput = qs('#maxPrice');
const conditionChips = qs('#conditionChips');
const applyFiltersBtn = qs('#applyFilters');
const clearFiltersBtn = qs('#clearFilters');
const searchInput = qs('#searchInput');
const searchBtn = qs('#searchBtn');
const sortSelect = qs('#sortSelect');
const activeFilters = qs('#activeFilters');

const openSellBtn = qs('#openSell');
const openDonateBtn = qs('#openDonate');
const modal = qs('#modal');
const modalTitle = qs('#modalTitle');
const sellForm = qs('#sellForm');
const cancelModalBtn = qs('#cancelModal');
const closeModalBtn = qs('#closeModal');
const homeBtn = qs('#homeBtn');
const linkSell = qs('#linkSell');
const linkDonate = qs('#linkDonate');

// ------- UI init -------
function init(){
  renderConditionChips();
  renderListings();
  renderCounts();

  // wire events
  applyFiltersBtn.addEventListener('click', onApplyFilters);
  clearFiltersBtn.addEventListener('click', onClearFilters);
  searchBtn.addEventListener('click', onSearch);
  searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') onSearch() });
  categorySelect.addEventListener('change', renderListings);
  sortSelect.addEventListener('change', renderListings);

  drawerBtn.addEventListener('click', ()=>openDrawer('cart'));
  wishlistBtn.addEventListener('click', ()=>openDrawer('wishlist'));
  closeDrawerBtn.addEventListener('click', closeDrawer);

  openSellBtn.addEventListener('click', ()=>openModal('sell'));
  openDonateBtn.addEventListener('click', ()=>openModal('donate'));
  linkSell.addEventListener('click', (e)=>{e.preventDefault(); openModal('sell')});
  linkDonate.addEventListener('click', (e)=>{e.preventDefault(); openModal('donate')});

  cancelModalBtn.addEventListener('click', closeModal);
  closeModalBtn.addEventListener('click', closeModal);

  sellForm.addEventListener('submit', onSubmitListing);
  homeBtn.addEventListener('click', ()=>{ resetUI(); renderListings(); });

  // prepopulate price inputs based on products
  const prices = state.products.map(p=>p.price||0);
  minPriceInput.value = Math.min(...prices).toString();
  maxPriceInput.value = Math.max(...prices).toString();

  renderActiveFilters();
}
window.addEventListener('load', init);

// ------- Render functions -------
function renderConditionChips(){
  conditionChips.innerHTML = '';
  CONDITIONS.forEach(cond=>{
    const btn = document.createElement('button');
    btn.className='chip';
    btn.textContent = cond.replace('_',' ');
    btn.dataset.cond = cond;
    btn.addEventListener('click', ()=>{
      btn.classList.toggle('active');
      renderActiveFilters();
      // do not auto-apply — user clicks Apply
    });
    conditionChips.appendChild(btn);
  });
}

function getFilters(){
  const activeChips = Array.from(conditionChips.querySelectorAll('.chip.active')).map(b=>b.dataset.cond);
  const cat = categorySelect.value;
  const min = parseInt(minPriceInput.value || '0',10);
  const max = parseInt(maxPriceInput.value || '99999999',10);
  const q = (searchInput.value || '').trim().toLowerCase();
  const sort = sortSelect.value;
  return { activeChips, cat, min, max, q, sort };
}

function renderActiveFilters(){
  const f = getFilters();
  const parts = [];
  if(f.cat && f.cat !== 'all') parts.push(`Category: ${f.cat}`);
  if(f.activeChips.length) parts.push(`Condition: ${f.activeChips.join(', ')}`);
  if(f.min) parts.push(`Min ₹${f.min}`);
  if(f.max && f.max < 9999999) parts.push(`Max ₹${f.max}`);
  if(f.q) parts.push(`Search: "${f.q}"`);
  activeFilters.innerHTML = parts.map(p=>`<span class="chip" style="cursor:default">${p}</span>`).join(' ');
}

// Main listing renderer
function renderListings(){
  const f = getFilters();
  let list = state.products.slice();

  // search
  if(f.q){
    list = list.filter(p => (p.title + ' ' + (p.description||'') + ' ' + p.category).toLowerCase().includes(f.q));
  }
  // category
  if(f.cat && f.cat !== 'all') list = list.filter(p=>p.category === f.cat);
  // conditions
  if(f.activeChips.length) list = list.filter(p=>f.activeChips.includes(p.condition));
  // price
  list = list.filter(p => {
    const price = Number(p.price||0);
    return price >= f.min && (f.max === 0 || price <= f.max || f.max>0);
  });

  // sort
  if(f.sort === 'price_asc') list.sort((a,b)=> (Number(a.price||0) - Number(b.price||0)));
  if(f.sort === 'price_desc') list.sort((a,b)=> (Number(b.price||0) - Number(a.price||0)));
  if(f.sort === 'newest') list.sort((a,b)=> new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  listingsEl.innerHTML = '';
  if(list.length === 0){
    emptyEl.hidden = false;
    return;
  } else {
    emptyEl.hidden = true;
  }

  list.forEach(p => listingsEl.appendChild(renderCard(p)));
}

function renderCard(p){
  const card = document.createElement('article');
  card.className = 'card';
  // image
  const img = document.createElement('img');
  img.src = p.images?.[0] || 'https://via.placeholder.com/400x300?text=Item';
  img.alt = p.title;
  card.appendChild(img);
  // badge row
  const bt = document.createElement('div');
  bt.className = 'badge-type';
  bt.textContent = p.type === 'DONATE' || p.price == 0 ? 'Free — Donate' : p.condition.replace('_',' ');
  card.appendChild(bt);
  // title
  const h3 = document.createElement('h3');
  h3.textContent = p.title;
  card.appendChild(h3);
  // meta
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${p.category} • ${p.description || ''}`;
  card.appendChild(meta);
  // price
  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = p.price && p.price>0 ? `₹${p.price}` : 'Free';
  card.appendChild(price);
  // actions
  const actions = document.createElement('div');
  actions.className = 'actions';
  const cartBtn = document.createElement('button');
  cartBtn.className = 'btn';
  cartBtn.textContent = 'Add to Cart';
  cartBtn.addEventListener('click', ()=>{ addToCart(p.id); });
  const wishBtn = document.createElement('button');
  wishBtn.className = 'icon-small';
  wishBtn.textContent = state.wishlist.includes(p.id) ? '♥' : '♡';
  wishBtn.addEventListener('click', ()=>{
    toggleWishlist(p.id);
    wishBtn.textContent = state.wishlist.includes(p.id) ? '♥' : '♡';
  });
  const viewBtn = document.createElement('button');
  viewBtn.className = 'icon-small';
  viewBtn.textContent = 'Details';
  viewBtn.addEventListener('click', ()=>openDetails(p));
  actions.appendChild(cartBtn);
  actions.appendChild(wishBtn);
  actions.appendChild(viewBtn);
  card.appendChild(actions);
  return card;
}

// Open details modal (quick)
function openDetails(p){
  alert(`${p.title}\n\n${p.description || ''}\n\nCategory: ${p.category}\nCondition: ${p.condition}\nPrice: ${p.price>0 ? '₹'+p.price : 'Free'}`);
}

// ------- Cart & Wishlist logic -------
function renderCounts(){
  wishCount.textContent = String(state.wishlist.length || 0);
  cartCount.textContent = String(state.cart.length || 0);
}

// Add to cart
function addToCart(id){
  if(state.cart.includes(id)) { alert('Item already in cart'); return; }
  state.cart.push(id);
  saveState(); renderCounts();
  toast('Added to cart');
}

// Wishlist toggle
function toggleWishlist(id){
  const idx = state.wishlist.indexOf(id);
  if(idx >= 0) state.wishlist.splice(idx,1);
  else state.wishlist.push(id);
  saveState(); renderCounts(); renderListings();
}

// Drawer: cart or wishlist
function openDrawer(type){
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  drawerTitle.textContent = type === 'cart' ? 'Cart' : 'Wishlist';
  drawerContent.innerHTML = '';
  if(type === 'cart'){
    if(state.cart.length === 0) drawerContent.innerHTML = '<p>Your cart is empty</p>';
    state.cart.forEach(id => {
      const p = state.products.find(x=>x.id===id);
      if(!p) return;
      const row = document.createElement('div'); row.className='item';
      const img = document.createElement('img'); img.src = p.images?.[0]; img.width = 64; img.height = 48; img.style.borderRadius='8px';
      const info = document.createElement('div'); info.style.flex='1';
      info.innerHTML = `<div style="font-weight:600">${p.title}</div><div style="color:var(--muted)">₹${p.price||0}</div>`;
      const actions = document.createElement('div');
      // Save for later
      const saveBtn = document.createElement('button'); saveBtn.className='btn ghost'; saveBtn.textContent='Save for later';
      saveBtn.addEventListener('click', ()=>{
        moveToSaved(id);
      });
      // remove
      const rem = document.createElement('button'); rem.className='btn'; rem.textContent='Remove';
      rem.addEventListener('click', ()=>{
        removeFromCart(id);
      });
      actions.appendChild(saveBtn); actions.appendChild(rem);
      row.appendChild(img); row.appendChild(info); row.appendChild(actions);
      drawerContent.appendChild(row);
    });
    // saved list
    if(state.saved.length){
      drawerContent.appendChild(Object.assign(document.createElement('hr')));
      const title = document.createElement('div'); title.style.margin='10px 0'; title.textContent='Saved for later';
      drawerContent.appendChild(title);
      state.saved.forEach(id=>{
        const p = state.products.find(x=>x.id===id);
        const row = document.createElement('div'); row.className='item';
        row.innerHTML = `<div style="flex:1"><b>${p.title}</b><div style="color:var(--muted)">₹${p.price||0}</div></div>`;
        const moveBtn = document.createElement('button'); moveBtn.className='btn'; moveBtn.textContent='Move to cart';
        moveBtn.addEventListener('click', ()=>{ moveSavedToCart(id); });
        row.appendChild(moveBtn);
        drawerContent.appendChild(row);
      });
    }
  } else {
    // wishlist
    if(state.wishlist.length === 0) drawerContent.innerHTML = '<p>Your wishlist is empty</p>';
    state.wishlist.forEach(id=>{
      const p = state.products.find(x=>x.id===id);
      const row = document.createElement('div'); row.className='item';
      row.innerHTML = `<img src="${p.images?.[0] || ''}" width="64" height="48" style="border-radius:8px"/><div style="flex:1"><b>${p.title}</b><div style="color:var(--muted)">₹${p.price||0}</div></div>`;
      const addBtn = document.createElement('button'); addBtn.className='btn'; addBtn.textContent='Add to cart';
      addBtn.addEventListener('click', ()=>{ addToCart(p.id); closeDrawer(); });
      const remBtn = document.createElement('button'); remBtn.className='btn ghost'; remBtn.textContent='Remove';
      remBtn.addEventListener('click', ()=>{ toggleWishlist(p.id); openDrawer('wishlist');});
      row.appendChild(addBtn); row.appendChild(remBtn);
      drawerContent.appendChild(row);
    });
  }
}

function closeDrawer(){
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
}

function removeFromCart(id){
  state.cart = state.cart.filter(x=>x!==id);
  saveState(); renderCounts(); openDrawer('cart'); renderListings();
}

function moveToSaved(id){
  state.cart = state.cart.filter(x=>x!==id);
  if(!state.saved.includes(id)) state.saved.push(id);
  saveState(); renderCounts(); openDrawer('cart');
}
function moveSavedToCart(id){
  state.saved = state.saved.filter(x=>x!==id);
  if(!state.cart.includes(id)) state.cart.push(id);
  saveState(); renderCounts(); openDrawer('cart');
}

// ------- sell / donate modal -------
function openModal(mode){
  modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
  sellForm.reset();
  sellForm.type.value = mode === 'donate' ? 'DONATE' : 'SELL';
  modalTitle.textContent = mode === 'donate' ? 'Donate an item' : 'Sell an item';
  // if donate, set price to 0
  if(mode === 'donate') sellForm.price.value = 0;
}
function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }

function onSubmitListing(e){
  e.preventDefault();
  const fd = new FormData(sellForm);
  const item = {
    id: genId(),
    title: fd.get('title') || 'Untitled',
    category: fd.get('category') || 'Other',
    condition: fd.get('condition') || 'GOOD',
    price: Number(fd.get('price') || 0),
    description: fd.get('description') || '',
    images: [`https://picsum.photos/seed/${Math.floor(Math.random()*1000)}/800/600`],
    type: fd.get('type') || 'SELL',
    createdAt: new Date().toISOString()
  };
  state.products.unshift(item);
  saveState();
  closeModal();
  renderListings();
  toast('Listing created!');
}

// ------- filter actions -------
function onApplyFilters(){ renderActiveFilters(); renderListings(); }
function onClearFilters(){
  // clear chips
  qsa('#conditionChips .chip').forEach(b=>b.classList.remove('active'));
  categorySelect.value = 'all';
  minPriceInput.value = '';
  maxPriceInput.value = '';
  searchInput.value = '';
  sortSelect.value = 'newest';
  renderActiveFilters(); renderListings();
}
function onSearch(){ renderActiveFilters(); renderListings(); }

// quick toast
function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position='fixed'; el.style.bottom='20px'; el.style.left='50%'; el.style.transform='translateX(-50%)';
  el.style.padding='10px 14px'; el.style.background='linear-gradient(90deg,var(--accent),var(--accent-2))'; el.style.color='white';
  el.style.borderRadius='10px'; el.style.boxShadow='0 6px 18px rgba(2,6,23,0.12)'; el.style.zIndex=9999;
  document.body.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.addEventListener('transitionend', ()=>el.remove()); }, 1400);
}

// reset some UI
function resetUI(){
  onClearFilters();
  window.scrollTo({top:0, behavior:'smooth'});
}

// small helpers: persist and rerender counts
function persistAndRerender(){ saveState(); renderCounts(); renderListings(); }

// Listen for storage changes (if multiple tabs)
window.addEventListener('storage', ()=>{ Object.assign(state, loadState()); renderCounts(); renderListings(); });

// Save state whenever we change arrays
const proxState = new Proxy(state, {
  set(target, prop, value){
    target[prop]=value;
    saveState();
    return true;
  }
});

// Put a small interval to persist (not necessary but ensures state durable)
setInterval(saveState, 2000);
