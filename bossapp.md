# Garbage Application Backend Design Document

## The role of the Backend
The backend should do the calculation, and storage of the data that has been added to the long term storage, and give back cheved data to the frontend.

## Design
data_storage ---- backend ---- frontend ---- user

### Backend 
/add_datapoint ---> data ---> data_storage

/get_datapoint ---> data_storage ---
								   |
               return_data.json <---
			   
(we might need other endpoints, this should be easy to implement)

## Important design desicions
- There should be admin, and users, we need to make this secure
- we should make sure that all the data is cruched for the frontend
- we do not know how the data will be delivered, or read, as of yet, so we need to make surte that we can add this later
- *the codeAssistent should recoment stack for Backend*
- *the codeAssistent should recomend other improvements*
