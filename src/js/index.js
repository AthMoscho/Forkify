import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from './views/base';

/****Global state of the app ****
* - Search Object
* - Current recipe object
* - Shopping list object 
* - Liked recipes
*/

const state = {};

/**** Search controller ****/

const controlSearch = async () => {
    //Get Query from the view
    const query = searchView.getInput(); //ToDo

    if (query) {
        // New search object and add to state
        state.search = new Search(query);
        // Prepare UI for results
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try {
            // Search for recipes
            await state.search.getResults();

            // Render results on the UI
            clearLoader();
            searchView.renderResult(state.search.result);
        } catch (err) {
            console.log(err);
            clearLoader();
        }
    }
};

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResult(state.search.result, goToPage);
        
    }
});

/****Recipe Controller****/

const controlRecipe = async () => {
    //Get id from url
    const id = window.location.hash.replace('#', '');

    if (id) {
        //Prepare ui for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        //Highlight selected search item 
        if (state.search) {
            searchView.highlightSelected(id);
        }
        //Create new recipe object
        state.recipe = new Recipe(id);
        try {
            //Get recipe data and parse ingredients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();
            //Calculate time and servings
            state.recipe.calcTime();
            state.recipe.calcServings();

            //Render recipe
            clearLoader();
            recipeView.renderRecipe(
                state.recipe,
                state.likes.isLiked(id)
                );

        } catch (err) {
            console.log(err);
        }
    }

};

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

/****List Controller****/

const controlList = () => {
    //create new list if there is none yet
    if (!state.list) state.list = new List();
    //add each ingredient to the list
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    })
};

//Handle delete and update list item events
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    if (e.target.matches('.shopping__delete, .shopping__delete *')){
        //delete from state
        state.list.deleteItem(id);
        //delete from UI
        listView.deleteItem(id);

    //handle count update
    } else if (e.target.matches('.shopping__count-value')){
        const value = parseFloat(e.target.value, 10);
        state.list.updateCount(id, value);
    }
});



/****Like Controller****/ 
const controlLike = () => {
    if (!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id;
    
    //Not yet like current recipe
    if(!state.likes.isLiked(currentID)) {
        //addlike to data
        const newLike = state.likes.addLike(
            currentID,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img

        );
        //toggle the like button
        likesView.toggleLikeBtn(true);
    
        //add like to UI list
        likesView.renderLike(newLike);    
        
    //Has like current recipe
    }else {
        //remove like from state
        state.likes.deleteLikes(currentID);

        //toggle the like button    
        likesView.toggleLikeBtn(false);
 
        //remove item from  UI list
        likesView.deleteLike(currentID);   
    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Restore likes recipe on page load

window.addEventListener('load', () => {
    state.likes = new Likes();
   
    //Restore Likes
    state.likes.readStorage();
   
    //Toggle like menu button
    likesView.toggleLikeMenu(state.likes.getNumLikes());
   
    //render the existing likes
    state.likes.likes.forEach(like => likesView.renderLike(like));

});

// Handling recipe button clicks  
elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        if (state.recipe.servings > 1){
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if (e.target.matches('.btn-increase, .btn-increase *')){
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if (e.target.matches('.recipe__btn-add, .recipe__btn-add *')) {
        //add ingredients to shopping list
        controlList();
    }else if (e.target.matches('.recipe__love, .recipe__love *')) {
        // Like controller 
        controlLike();
    }
});